import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Health Check
export const getHealth = () => api.get('/health');

// Device Management
export const getDevices = () => api.get('/devices');
export const getDevice = (deviceId) => api.get(`/devices/${deviceId}`);
export const registerDevice = (data) => api.post('/devices', data);

// Data Records
export const getRecords = (deviceId) => api.get('/records', { params: { deviceId } });
export const getRecord = (deviceId, index) => api.get(`/records/${deviceId}/${index}`);

// Data Upload
export const uploadData = (formData) => api.post('/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// Data Download
export const getDownloadUrl = (hash) => `/api/download?hash=${hash}`;

// Data Integrity Verification
export const verifyData = (data) => api.post('/verify', data);

// Access Control
export const grantAccess = (data) => api.post('/access/grant', data);
export const revokeAccess = (data) => api.post('/access/revoke', data);
export const checkAccess = (userAddress, deviceId) =>
  api.get('/access/check', { params: { userAddress, deviceId } });

// Blockchain Accounts
export const getAccounts = () => api.get('/blockchain/accounts');

export default api;
