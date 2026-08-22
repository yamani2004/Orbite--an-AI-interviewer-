package com.orbite.core;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("local")
class CodeRunnerService {
  CodeRunResponse run(CodeRunRequest request) {
    if (request == null || request.source() == null || request.source().isBlank()) return new CodeRunResponse(false, false, -1, "", "Source code is required.");
    if (!"cpp".equalsIgnoreCase(request.language()) && !"c++".equalsIgnoreCase(request.language())) return new CodeRunResponse(false, false, -1, "", "Only C++ is enabled for the local runner.");
    Path dir = null;
    try {
      dir = Files.createTempDirectory("orbite-code-");
      Path source = dir.resolve("solution.cpp");
      Path binary = dir.resolve("solution.exe");
        boolean hasMain = request.source().matches("(?s).*\\bmain\\s*\\(");
      Files.writeString(source, request.source(), StandardCharsets.UTF_8);
        Process compile = hasMain
          ? new ProcessBuilder("g++", "-std=c++17", "-O2", "-pipe", source.toString(), "-o", binary.toString()).redirectErrorStream(true).start()
          : new ProcessBuilder("g++", "-std=c++17", "-O2", "-pipe", "-c", source.toString(), "-o", dir.resolve("solution.o").toString()).redirectErrorStream(true).start();
      String compileOutput = read(compile);
      if (!compile.waitFor(8, TimeUnit.SECONDS)) { compile.destroyForcibly(); return new CodeRunResponse(false, true, -1, "", "Compilation timed out."); }
      if (compile.exitValue() != 0) return new CodeRunResponse(false, false, compile.exitValue(), "", compileOutput);
      if (!hasMain) return new CodeRunResponse(true, false, 0, "", "Compilation passed. This is a Solution class without main(); run it through the problem test harness to validate test cases.");
      Process execute = new ProcessBuilder(binary.toString()).redirectErrorStream(true).start();
      if (request.stdin() != null && !request.stdin().isEmpty()) execute.getOutputStream().write(request.stdin().getBytes(StandardCharsets.UTF_8));
      execute.getOutputStream().close();
      if (!execute.waitFor(3, TimeUnit.SECONDS)) { execute.destroyForcibly(); return new CodeRunResponse(true, true, -1, read(execute), "Execution timed out after 3 seconds."); }
      return new CodeRunResponse(true, false, execute.exitValue(), read(execute), execute.exitValue() == 0 ? "" : "Program exited with an error.");
    } catch (IOException exception) {
      return new CodeRunResponse(false, false, -1, "", "The local C++ compiler (g++) is unavailable.");
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      return new CodeRunResponse(false, true, -1, "", "Code execution was interrupted.");
    } finally {
      if (dir != null) try { Files.walk(dir).sorted(java.util.Comparator.reverseOrder()).forEach(path -> path.toFile().delete()); } catch (IOException ignored) { }
    }
  }

  private String read(Process process) throws IOException { return new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8); }
}
