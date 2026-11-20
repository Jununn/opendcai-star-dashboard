import urllib.request, json, datetime, pathlib, re, os, time
repos=['DataFlow','DataFlex','Paper2Any','OpenWorldLib','GameFactory-3A','DataMind']
end=datetime.datetime.now(datetime.timezone.utc).date(); start=datetime.date(2026,11,1); data={}
def api(path):
 for attempt in range(3):
  try:
   req=urllib.request.Request('https://api.github.com/'+path,headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10','User-Agent':'opendcai-dashboard','Authorization':'Bearer '+os.environ['GITHUB_TOKEN']})
   with urllib.request.urlopen(req,timeout=45) as r:return json.load(r)
  except Exception:
   if attempt==2:raise
   time.sleep(3*(attempt+1))
for repo in repos:
 base='repos/OpenDCAI/'+repo;meta=api(base);counts={}
 for page in range(1,101):
  weeks=api(base+'/stargazers/history?per_page=30&page='+str(page))
  if not isinstance(weeks,list):raise ValueError('Invalid history')
  oldest=end
  for week in weeks:
   for i,n in enumerate(week['days']):
    d=(datetime.datetime.fromtimestamp(week['week'],datetime.timezone.utc)+datetime.timedelta(days=i)).date();oldest=min(oldest,d)
    if start<=d<=end:
     if not isinstance(n,int) or n<0:raise ValueError('Invalid count')
     counts[d.isoformat()]=n
  if not weeks or oldest<=start or len(weeks)<30:break
 expected={(start+datetime.timedelta(days=i)).isoformat() for i in range((end-start).days+1)}
 if not expected<=counts.keys():raise ValueError('Missing daily history for '+repo)
 data[repo]={'total':meta['stargazers_count'],'counts':counts,'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
p=pathlib.Path('index.html');s=p.read_text(encoding='utf-8-sig')
pattern=r'data=\{"DataFlow".*?;render\(\);\$\(\'snapshotTime\'\)'
s,n=re.subn(pattern,lambda m:'data='+json.dumps(data,ensure_ascii=False)+";render();$('snapshotTime')",s,flags=re.S)
if n!=1:raise ValueError('Snapshot marker missing; refusing to overwrite')
p.write_text(s,encoding='utf-8')
print('Updated',end,'total',sum(x['total'] for x in data.values()))
