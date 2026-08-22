package com.orbite.api;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.orbite.core.InterviewNotFoundException;
@RestControllerAdvice public class ApiExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
  Map<String, String> validation(MethodArgumentNotValidException e) { return Map.of("message", e.getBindingResult().getFieldErrors().get(0).getDefaultMessage()); }
  @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST)
  Map<String, String> illegal(IllegalArgumentException e) { return Map.of("message", e.getMessage()); }
  @ExceptionHandler(InterviewNotFoundException.class) @ResponseStatus(HttpStatus.NOT_FOUND)
  Map<String, String> missing(InterviewNotFoundException e) { return Map.of("message", "Interview not found."); }
}
