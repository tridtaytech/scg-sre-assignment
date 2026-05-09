package com.scg.asgn.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class VersionHeadersFilter extends OncePerRequestFilter {

    private final String appVersion;
    private final String podName;
    private final String rolloutColor;

    public VersionHeadersFilter(
        @Value("${app.version:dev}") String appVersion,
        @Value("${app.pod-name:local}") String podName,
        @Value("${app.rollout-color:none}") String rolloutColor
    ) {
        this.appVersion = appVersion;
        this.podName = podName;
        this.rolloutColor = rolloutColor;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
        throws ServletException, IOException {
        res.setHeader("X-App-Version", appVersion);
        res.setHeader("X-Pod-Name", podName);
        res.setHeader("X-Rollout-Color", rolloutColor);
        chain.doFilter(req, res);
    }
}
