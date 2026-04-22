SERVER_CMD := uv run uvicorn backend.main:app --port 8000
CLIENT_CMD := npm --prefix pose-estimation-app run dev -- --host
SERVER_PORT := 8000
SERVER_HOST := localhost 
BACKEND_DIR := /Users/weijie/code/fyp
FRONTEND_DIR := /Users/weijie/code/fyp

purple := \033[0;32m
reset = \033[0m
RED := $(shell printf "\033[0;31m")
CYAN := $(shell printf "\033[0;36m")
MAGENTA := $(shell printf "\033[0;35m")
RESET := $(shell printf "\033[0m")

dev:
	@echo "${purple}=== Starting Development Environment ===${reset}"; \
	( cd $(BACKEND_DIR) && $(SERVER_CMD) 2>&1 | sed -l "s/^/$(CYAN)[server] $(RESET)/" ) & \
	SERVER_PID=$$!; \
	echo "${purple}Server running with PID: $$SERVER_PID${reset}"; \
	echo "${purple}Waiting for server on port $(SERVER_PORT)...${reset}"; \
	while ! nc -z $(SERVER_HOST) $(SERVER_PORT); do sleep 0.5; done; \
	echo "${purple}Server ready! Starting client...${reset}"; \
	( cd $(FRONTEND_DIR) && $(CLIENT_CMD) 2>&1 | sed -l "s/^/$(MAGENTA)[client] $(RESET)/" ) & \
	CLIENT_PID=$$!; \
	echo "${purple}Client running with PID: $$CLIENT_PID${reset}"; \
	wait $$SERVER_PID $$CLIENT_PID; \
	echo "=== One process exited. Cleaning up ==="; \
	kill $$SERVER_PID $$CLIENT_PID 2>/dev/null || true
