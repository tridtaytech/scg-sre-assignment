package com.scg.asgn.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateItemRequest(
    @NotBlank @Size(max = 80) String name
) {}
