FROM ubuntu:latest

WORKDIR /source

SHELL ["/bin/bash", "-c"]

# RUN alias sudo=""

RUN apt update && apt upgrade && apt install curl -y

RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

RUN apt install -y nodejs libtool build-essential libc6 libstdc++6 libopenjp2-tools rpm libnotify-dev libxtst-dev libnss3-dev libavcodec-dev libavformat-dev

RUN corepack enable yarn

CMD "./build.sh"
