# k8s-redis-cluster

This repository contains an example of how to create a Redis Cluster on Kubernetes! 🚀

## Table of Contents

- [Pre-requisites](#pre-requisites)
- [Getting started](#getting-started)
  - [Creating namespaces](#creating-namespaces)
  - [Starting the cluster](#starting-the-cluster)
- [Verifying the cluster deployment](#verifying-the-cluster-deployment)
- [Testing the cluster](#testing-the-cluster)
- [References](#references)

## Pre-requisites

I will assume that you have the following tools installed and configured:

- [Docker](https://docs.docker.com/get-docker/): 19.03.13 or higher.
- [minikube](https://kubernetes.io/docs/tasks/tools/): v1.15.1 or higher.

> This project used the minikube to simulate Kubernetes. All `.yaml` files can be used in Kubernetes itself.

## Getting started

### Creating namespaces

Let's simulate the closest production environment, where we can have a namespace reserved for different contexts. Create the `staging` and `redis` namespaces:

```bash
$ kubectl create ns redis
$ kubectl create ns staging
```

### Starting the cluster

Let's start the Redis cluster in the `redis` namespace:

```bash
$ kubectl apply -f manifests/01-redis-cluster -n redis
```

Check the pods and services created:

```bash
$ kubectl get all -n redis
```

We are not done yet. We need to join the nodes and initialize the cluster through `redis-cli`. For this, we will use the CLI on the first node (`redis-cluster-0`), informing the others:

```bash
$ kubectl exec -it redis-cluster-0 -n redis -- redis-cli --cluster create $(kubectl get pods -l app=redis-cluster -o jsonpath='{range .items[*]}{.status.podIP}:6379 {end}' -n redis) --cluster-replicas 1
```

> You will need to write "yes" on terminal to accept the configuration.

## Verifying the cluster deployment

Let's check if the cluster status is "ok":

```bash
$ kubectl exec -it redis-cluster-0 -n redis -- redis-cli cluster info
```

We can also check which role has been assigned to each node:

```bash
$ for x in $(seq 0 5); do echo "redis-cluster-$x"; kubectl exec redis-cluster-$x -n redis -- redis-cli role; echo; done
```

## Testing the cluster

I created a simple application using [express](https://expressjs.com/pt-br/) for HTTP server and [ioredis](https://github.com/luin/ioredis) to communicate with our cluster. I already hosted it on the [Docker Hub](https://hub.docker.com/) to just create an instance within our K8s cluster. Let's create it in the `staging` namespace:

> **ioredis** implements Read-write splitting. Where we can define that all recording is done on the master nodes and all reading is done on slaves. See more: https://github.com/luin/ioredis#read-write-splitting

```bash
$ kubectl apply -f manifests/02-ioredis-app -n staging
```

Check the pods and services created:

```bash
$ kubectl get all -n staging
```

We can read the data from our Redis:

```bash
$ IOREDISAPP=$(minikube service ioredis-app --url -n staging)
$ curl --location --request GET "$IOREDISAPP/read" -w "\n"
# {"data":{"key":"default","value":null}}
```

And also write:

```bash
$ IOREDISAPP=$(minikube service ioredis-app --url -n staging)
$ curl --location --request POST "$IOREDISAPP/write" \
$ --header 'Content-Type: application/json' \
$ --data-raw '{
$    "key": "default",
$    "value": "🚀"
$ }' -w "\n"
# {"data":{"key":"default","value":"🚀"}}
```

## References

- https://rancher.com/blog/2019/deploying-redis-cluster
- https://redis.io/topics/cluster-tutorial
