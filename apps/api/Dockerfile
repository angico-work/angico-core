FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -DskipTests package

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /workspace/target/angico-api-0.0.1-SNAPSHOT.jar /app/angico-api.jar
ENV SERVER_PORT=8082
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/angico-api.jar"]
