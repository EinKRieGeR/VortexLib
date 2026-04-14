import AdmZip from 'adm-zip';
const zip = new AdmZip('/mnt/raid0/downloads/fb2.Flibusta.Net/fb2-000024-030559.zip');
const entries = zip.getEntries();
console.log(entries.map(e => e.entryName).slice(0, 10));
