SERVER_CMD := uv run uvicorn backend.main:app --port 8088	# Command to start server
CLIENT_CMD := npm --prefix pose-estimation-app run dev          # Command to start client
SERVER_PORT := 8088 						# Server port to check
SERVER_HOST := localhost            				# Server host

dev:
	@echo "=== Starting Development Environment ==="; \
	( $(SERVER_CMD) 2>&1 | sed 's/^/[server] /' ) & \
	SERVER_PID=$$!; \
	echo "Server running with PID: $$SERVER_PID"; \
	echo "Waiting for server on port $(SERVER_PORT)..."; \
	while ! nc -z $(SERVER_HOST) $(SERVER_PORT); do sleep 0.5; done; \
	echo "Server ready! Starting client..."; \
	( $(CLIENT_CMD) 2>&1 | sed 's/^/[client] /' ) & \
	CLIENT_PID=$$!; \
	echo "Client running with PID: $$CLIENT_PID"; \
	wait
