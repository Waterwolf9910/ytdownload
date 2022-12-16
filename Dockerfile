FROM ubuntu:latest

WORKDIR /source

SHELL ["/bin/bash", "-c"]

RUN apt update && apt upgrade && apt install -y libtool build-essential libc6 libstdc++6 libopenjp2-tools rpm libnotify-dev libxtst-dev libnss3-dev libavcodec-dev libavformat-dev
