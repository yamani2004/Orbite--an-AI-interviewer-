package com.orbite.core;

record CodeRunRequest(String language, String source, String stdin) {}
record CodeRunResponse(boolean compiled, boolean timedOut, int exitCode, String output, String error) {}
