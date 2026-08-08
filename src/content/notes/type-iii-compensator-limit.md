---
title: "Where a Type-III Compensator Stops Helping"
description: "Sampling, computation, and PWM update delay impose a harder bandwidth boundary than compensator algebra suggests."
date: 2026-08-06
category: "Digital Power & Control"
tags:
  - Loop Shaping
  - Digital Delay
  - First Principles
type: "Lab Note"
featured: true
draft: false
authors: []
references: []
visual: "control-bandwidth"
featureSize: "narrow"
featuredOrder: 3
placeholder: true
---

This editorial placeholder sketches the structure of a future control note. It does not report a measured loop response, a controller from a released or unreleased product, or a recommended bandwidth.

## Compensation is only one part of the loop

A compensator can shape gain and phase, but it cannot remove latency elsewhere in a sampled-data control path. The complete reasoning chain has to include sensing, sampling, computation, modulation, and the timing of the actuator update.

## Draw the timing path

Before selecting zeros and poles, the finished note will draw an event timeline:

1. the signal is observed;
2. a sample is acquired;
3. the control law is evaluated;
4. a command waits for its update instant;
5. the plant begins to respond.

That timeline makes delay an architectural property of the loop rather than a correction applied after compensator design.

## Separate three limits

### Plant limit

The plant dynamics and operating region establish what the loop must control.

### Discrete-time limit

Sampling and update timing introduce phase behavior that a continuous-time sketch can hide.

### Evidence limit

Claims about achievable bandwidth need a stated model and reproducible measurement method. The future note will supply those; this placeholder deliberately does not.
