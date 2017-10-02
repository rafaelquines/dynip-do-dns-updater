# dynip-do-dns-updater
It's a node app to update your DNS record on Digital Ocean with your dynamic ip

To run locally, create a .env file with the following variables:

- DO_API_KEY => Your Digital Ocean API KEY
- DOMAIN_NAME => Your domain (mywebsite.com)
- RECORD_NAME => Your DNS (home, server, office, etc)
- RECORD_TYPE => DNS Record Type (Default: A)
- INTERVAL => Time interval in seconds to verify ip and updates DNS record (Default: 60)

or use my docker image: https://hub.docker.com/r/rafaelquines/dynip-do-dns-updater/
