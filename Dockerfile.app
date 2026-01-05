# Multi-runtime Dockerfile with LuaLaTeX, Golang, and Node.js
# Base: Ubuntu 22.04 with TexLive for lualatex support

FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install base dependencies and TexLive (lualatex)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    git \
    build-essential \
    # TexLive for lualatex
    texlive-full \
    texlive-luatex \
    texlive-latex-extra \
    texlive-fonts-extra \
    texlive-science \
    latexmk \
    # Additional utilities
    procps \
    && rm -rf /var/lib/apt/lists/*

# Install Golang 1.22
ENV GO_VERSION=1.22.5
RUN curl -fsSL https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz | tar -C /usr/local -xz
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/go"
ENV PATH="${GOPATH}/bin:${PATH}"

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN echo "=== Installed Versions ===" \
    && lualatex --version | head -1 \
    && go version \
    && node --version \
    && npm --version

# Create working directories
RUN mkdir -p /ingestion /app /reingestion

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set working directory
WORKDIR /app

# Expose common ports
EXPOSE 8080 8081 3000

# Use custom entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Default command
CMD ["bash"]
