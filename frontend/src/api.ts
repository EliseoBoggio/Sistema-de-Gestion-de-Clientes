import axios from 'axios'


export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api'
export const api = axios.create({ baseURL: API_BASE })


api.interceptors.response.use(r=>r, err=>{
const msg = err?.response?.data?.detail || err?.message || 'Error inesperado'
console.error('API error:', msg, err?.response?.data)
return Promise.reject(err)
})