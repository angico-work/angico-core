export default {
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:8082',
        changeOrigin: true
      }
    }
  }
}
