FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/migrate ./cmd/migrate \
 && CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/adminctl ./cmd/adminctl

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /out/ /app/
COPY migrations ./migrations
ENV UPLOADS_DIR=/app/uploads MIGRATIONS_DIR=/app/migrations PORT=8090
EXPOSE 8090
CMD ["/app/api"]
