FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /app/target/*.jar app.jar
RUN chown -R app:app /app
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q UP || exit 1
ENTRYPOINT ["java", \
  "-XX:+UseSerialGC", \
  "-Xmx192m", "-Xms64m", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:ReservedCodeCacheSize=64m", \
  "-XX:MaxDirectMemorySize=48m", \
  "-Xss512k", \
  "-XX:+ExitOnOutOfMemoryError", \
  "-jar", "app.jar"]
