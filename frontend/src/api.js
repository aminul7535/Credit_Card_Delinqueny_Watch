import axios from 'axios';

const BASE = 'http://127.0.0.1:8000';

export async function uploadCSV(file) {
  const form = new FormData();
  form.append('file', file);

  const res = await axios.post(`${BASE}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return res.data;
}

export async function getSummary() {
  const res = await axios.get(`${BASE}/summary`);
  return res.data;
}

export async function getCustomer(id) {
  const res = await axios.get(`${BASE}/customer/${id}`);
  return res.data;
}

export async function downloadScoredCSV() {
  const res = await axios.get(`${BASE}/download_scored_csv`, {
    responseType: 'blob'
  });
  return res.data;
}
