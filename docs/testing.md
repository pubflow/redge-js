# Testing

Run all checks:

```sh
npm run check
```

Individual commands:

```sh
npm run typecheck
npm test
npm run build
```

The test suite uses local mock HTTP and WebSocket servers. It does not require a running Redge instance.

For integration testing against a real Redge process:

1. Start Redge with `REDGE_DOCAPI_ENABLED=true`.
2. Use `baseUrl` pointing to the Document API listener.
3. Use `adminBaseUrl` pointing to the Admin API listener if testing `client.admin`.
