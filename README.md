# OpenDCAI Star dashboard

Public overview plus a gzip-compressed, PBKDF2-SHA256 (600000 iterations), AES-256-GCM encrypted full dashboard. The password is held only in the DASHBOARD_PASSWORD Actions Secret.

Nightly and manual updates decrypt in temporary runner storage, refresh, verify and re-encrypt before publication. Only index.html and assets/ are uploaded to Pages. Historical commits have not been rewritten.
