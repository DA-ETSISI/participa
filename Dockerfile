FROM mingc/latex:latest as latex

FROM node:20-bookworm

COPY --from=latex /usr/local/texlive /usr/local/texlive

ENV PATH="$PATH:/usr/local/texlive/2021/bin/x86_64-linux"

RUN apt-get update -q && apt-get install -y --no-install-recommends \
    gnupg ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://ftp-master.debian.org/keys/archive-key-12.asc | tee /etc/apt/keyrings/debian-archive-key-12.asc > /dev/null && \
    curl -fsSL https://ftp-master.debian.org/keys/archive-key-12-security.asc | tee /etc/apt/keyrings/debian-archive-key-12-security.asc > /dev/null && \
    curl -fsSL https://ftp-master.debian.org/keys/release-12.asc | tee /etc/apt/keyrings/debian-release-key-12.asc > /dev/null

RUN apt-get update -q && \
    apt-get install -y -qq --no-install-recommends \
        ca-certificates \
        curl \
        ghostscript \
        git \
        gnuplot \
        imagemagick \
        make \
        jq \
        qpdf \
        python3-pygments \
        wget \
        vim-tiny && \
    rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENTRYPOINT [ "npm", "start" ]
