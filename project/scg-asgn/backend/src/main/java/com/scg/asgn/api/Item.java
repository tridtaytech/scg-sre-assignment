package com.scg.asgn.api;

import java.time.Instant;

public record Item(String id, String name, Instant createdAt) {}
