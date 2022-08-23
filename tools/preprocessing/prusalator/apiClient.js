const axios = require('axios')

const unwrapResponse = (response) => {
  if (response.status === 200) {
    return response.data
  }
  throw response
}

function createApiClient(config) {
  const { projectId, serverUrl, token } = config

  const defaultConfig = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }

  function get(url) {
    return axios.get(`${serverUrl}${url}`, defaultConfig).then(unwrapResponse)
  }

  function post(url, data) {
    return axios.post(`${serverUrl}${url}`, data, defaultConfig).then(unwrapResponse)
  }

  return {
    exportProject: (locale) => get(`/api/project/${projectId}/export_file?format=simple_json&locales=${locale}`),
    pull: (locale) => get(`/api/project/${projectId}/locale/${locale}/pull?per_page=1000`),
    push: (locale, data) => post(`/api/project/${projectId}/locale/${locale}/push`, data)
  }
}

module.exports = { createApiClient }
