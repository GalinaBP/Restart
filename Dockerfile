# syntax=docker/dockerfile:1

# --- Build stage -------------------------------------------------------------
# Pin to a JDK 21 + Maven image. Adjust the tag to a digest for reproducible prod builds.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Prime the dependency cache separately from source for faster incremental builds.
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --- Runtime stage -----------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

# curl is used by the container health check against the actuator endpoint.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user.
RUN useradd --system --uid 10001 --create-home appuser
USER appuser

COPY --from=build /workspace/target/restart-backend.jar app.jar

EXPOSE 8080
ENV JAVA_OPTS=""
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
