#!/bin/bash

sudo docker-compose -f docker-compose-dev.yml down -v
sudo docker-compose -f docker-compose-dev.yml build --no-cache
sudo docker-compose -f docker-compose-dev.yml up