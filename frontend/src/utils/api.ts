const API_BASE = 'http://localhost:8000/api'

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('crom-token')
  const headers = {
    ...options.headers,
    'Accept': 'application/json',
  } as Record<string, string>

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Set default Content-Type for JSON payloads if not already set
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const absoluteUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
  const response = await fetch(absoluteUrl, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    const hadSession = localStorage.getItem('crom-session')
    localStorage.removeItem('crom-session')
    localStorage.removeItem('crom-token')
    // Trigger redirect to login by reloading if in authenticated state
    if (hadSession) {
      window.location.href = '/login'
    }
  }

  return response
}
