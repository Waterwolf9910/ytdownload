FROM ubuntu:20.04

WORKDIR /source

SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt upgrade -y && apt-get install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

RUN NODE_MAJOR=20 echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

RUN apt update && apt install -y nodejs libtool build-essential libc6 libstdc++6 libopenjp2-tools rpm libnotify-dev libxtst-dev libnss3-dev libavcodec-dev libavformat-dev

RUN apt clean

RUN corepack enable yarn

CMD "./build.sh"
