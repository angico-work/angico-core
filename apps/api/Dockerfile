FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN groupadd --system --gid 10001 angico \
    && useradd --system --uid 10001 --gid angico --home-dir /app --shell /usr/sbin/nologin angico \
    && mkdir -p /app/uploads \
    && chown -R 10001:10001 /app
COPY --from=build --chown=10001:10001 /workspace/target/angico-api-0.0.1-SNAPSHOT.jar /app/angico-api.jar
ENV SERVER_PORT=8082
EXPOSE 8082
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/angico-api.jar"]
