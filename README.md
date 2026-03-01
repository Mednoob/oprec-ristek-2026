# Formaker
A form making app.

## Requirements
1. NodeJS (minimum v24)
2. PNPM
3. A PostgreSQL Server

## Installation / Setup
1. Rename `.env.example` to `.env` and fill each fields
2. Run `pnpm i` to install dependencies
3. Run `pnpx prisma migrate dev`
4. Run `pnpx prisma generate`
5. Run the server

## Running The Server
1. Development:
    ```shell
    pnpm run dev
    ```

2. Production:
    ```shell
    pnpm run build
    pnpm run start
    ```
