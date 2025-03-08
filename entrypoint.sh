#!/bin/bash
set -e

echo "Starting entrypoint script..."

# Create conf directory if it doesn't exist
if [ ! -d /opt/mirthconnect/conf ]; then
    echo "Creating conf directory..."
    mkdir -p /opt/mirthconnect/conf
fi

# Create keystore directory if it doesn't exist
if [ ! -d /opt/mirthconnect/keystore ]; then
    echo "Creating keystore directory..."
    mkdir -p /opt/mirthconnect/keystore
    
    # Create a default keystore file if it doesn't exist
    if [ ! -f /opt/mirthconnect/keystore/keystore.jks ]; then
        echo "Creating default keystore file..."
        keytool -genkey -keyalg RSA -alias mirthconnect -keystore /opt/mirthconnect/keystore/keystore.jks \
        -storepass changeme -keypass changeme -validity 3650 \
        -dname "CN=Mirth Connect, OU=Mirth, O=Mirth Corp, L=Dallas, ST=TX, C=US"
    fi
fi

# IMPORTANT: Don't copy keystore from appdata, always use a fresh one with known password
if [ -f /opt/mirthconnect/appdata/keystore.jks ]; then
    echo "Found old keystore in appdata, but will use the new one with correct password instead"
fi

# Create mirth.properties if it doesn't exist
if [ ! -f /opt/mirthconnect/conf/mirth.properties ]; then
    echo "Creating default mirth.properties..."
    echo "# Mirth Connect configuration file" > /opt/mirthconnect/conf/mirth.properties
    echo "database = mysql" >> /opt/mirthconnect/conf/mirth.properties
    echo "database.url = jdbc:mysql://db:3306/mirthdb?useSSL=false" >> /opt/mirthconnect/conf/mirth.properties
    echo "database.driver = com.mysql.jdbc.Driver" >> /opt/mirthconnect/conf/mirth.properties
    echo "database.username = mirth" >> /opt/mirthconnect/conf/mirth.properties
    echo "database.password = mirthpassword" >> /opt/mirthconnect/conf/mirth.properties
    echo "keystore.storepass = changeme" >> /opt/mirthconnect/conf/mirth.properties
    echo "keystore.keypass = changeme" >> /opt/mirthconnect/conf/mirth.properties
    echo "keystore.path = /opt/mirthconnect/keystore/keystore.jks" >> /opt/mirthconnect/conf/mirth.properties
    echo "http.port = 8080" >> /opt/mirthconnect/conf/mirth.properties
    echo "https.port = 8443" >> /opt/mirthconnect/conf/mirth.properties
fi

echo "Processing custom extensions..."
custom_extension_count=`ls -1 /opt/mirthconnect/custom-extensions/*.zip 2>/dev/null | wc -l`
if [ $custom_extension_count != 0 ]; then
    echo "Found ${custom_extension_count} custom extensions."
    for extension in $(ls -1 /opt/mirthconnect/custom-extensions/*.zip); do
        unzip -o -q $extension -d /opt/mirthconnect/extensions
    done
fi

echo "Configuring Mirth Connect properties..."

# set storepass and keypass explicitly to changeme
sed -i "s/^keystore\.storepass\s*=\s*.*\$/keystore.storepass = changeme/" /opt/mirthconnect/conf/mirth.properties
sed -i "s/^keystore\.keypass\s*=\s*.*\$/keystore.keypass = changeme/" /opt/mirthconnect/conf/mirth.properties

# set keystore path with absolute path
if grep -q "^keystore\.path" /opt/mirthconnect/conf/mirth.properties; then
    echo "Setting absolute keystore path"
    sed -i "s|^keystore\.path\s*=\s*.*\$|keystore.path = /opt/mirthconnect/keystore/keystore.jks|" /opt/mirthconnect/conf/mirth.properties
else
    echo "keystore.path = /opt/mirthconnect/keystore/keystore.jks" >> /opt/mirthconnect/conf/mirth.properties
fi

# db type
if ! [ -z "${DATABASE+x}" ]; then
    echo "Setting database type to $DATABASE"
    sed -i "s/^database\s*=\s*.*\$/database = ${DATABASE//\//\\/}/" /opt/mirthconnect/conf/mirth.properties
fi

# db username
if ! [ -z "${DATABASE_USERNAME+x}" ]; then
    echo "Setting database username"
    # Check if the property exists, if not add it
    if grep -q "^database\.username" /opt/mirthconnect/conf/mirth.properties; then
        sed -i "s/^database\.username\s*=\s*.*\$/database.username = ${DATABASE_USERNAME//\//\\/}/" /opt/mirthconnect/conf/mirth.properties
    else
        echo "database.username = ${DATABASE_USERNAME}" >> /opt/mirthconnect/conf/mirth.properties
    fi
fi

# db password
if ! [ -z "${DATABASE_PASSWORD+x}" ]; then
    echo "Setting database password"
    # Check if the property exists, if not add it
    if grep -q "^database\.password" /opt/mirthconnect/conf/mirth.properties; then
        sed -i "s/^database\.password\s*=\s*.*\$/database.password = ${DATABASE_PASSWORD//\//\\/}/" /opt/mirthconnect/conf/mirth.properties
    else
        echo "database.password = ${DATABASE_PASSWORD}" >> /opt/mirthconnect/conf/mirth.properties
    fi
fi

# db url
if ! [ -z "${DATABASE_URL+x}" ]; then
    echo "Setting database URL to $DATABASE_URL"
    sed -i "s|^database\.url\s*=\s*.*\$|database.url = ${DATABASE_URL//\//\\/}|" /opt/mirthconnect/conf/mirth.properties
fi

# db driver - ensure MySQL driver is set when using MySQL
if [ "$DATABASE" = "mysql" ]; then
    echo "Setting MySQL driver"
    if grep -q "^database\.driver" /opt/mirthconnect/conf/mirth.properties; then
        sed -i "s/^database\.driver\s*=\s*.*\$/database.driver = com.mysql.jdbc.Driver/" /opt/mirthconnect/conf/mirth.properties
    else
        echo "database.driver = com.mysql.jdbc.Driver" >> /opt/mirthconnect/conf/mirth.properties
    fi
fi

# database max connections
if ! [ -z "${DATABASE_MAX_CONNECTIONS+x}" ]; then
    echo "Setting database max connections"
    # Check if the property exists, if not add it
    if grep -q "^database\.max-connections" /opt/mirthconnect/conf/mirth.properties; then
        sed -i "s/^database\.max-connections\s*=\s*.*\$/database.max-connections = ${DATABASE_MAX_CONNECTIONS//\//\\/}/" /opt/mirthconnect/conf/mirth.properties
    else
        echo "database.max-connections = ${DATABASE_MAX_CONNECTIONS}" >> /opt/mirthconnect/conf/mirth.properties
    fi
fi

# Ensure http.port and https.port are set
if ! grep -q "^http\.port" /opt/mirthconnect/conf/mirth.properties; then
    echo "Setting HTTP port to 8080"
    echo "http.port = 8080" >> /opt/mirthconnect/conf/mirth.properties
fi

if ! grep -q "^https\.port" /opt/mirthconnect/conf/mirth.properties; then
    echo "Setting HTTPS port to 8443"
    echo "https.port = 8443" >> /opt/mirthconnect/conf/mirth.properties
fi

echo "Configuring VM options..."
if [ -f /opt/mirthconnect/mcserver_base.vmoptions ]; then
    cp /opt/mirthconnect/mcserver_base.vmoptions /opt/mirthconnect/mcserver.vmoptions
else
    echo "-Xmx512m" > /opt/mirthconnect/mcserver.vmoptions
fi

# merge vmoptions
if ! [ -z "${VMOPTIONS+x}" ]; then
    echo "Setting VM options: $VMOPTIONS"
    PREV_IFS="$IFS"
    IFS=","
    read -ra vmoptions <<< "$VMOPTIONS"
    IFS="$PREV_IFS"

    for vmoption in "${vmoptions[@]}"
    do
        echo "${vmoption}" >> /opt/mirthconnect/mcserver.vmoptions
    done
fi

# Wait for database to be ready
echo "Waiting for database connection..."
DB_READY=false
for i in {1..30}; do
    if [ "$DATABASE" = "mysql" ]; then
        # Try ping first
        if ping -c 1 db >/dev/null 2>&1; then
            echo "Database host is reachable"
            
            # Try a TCP connection check
            if command -v nc >/dev/null 2>&1; then
                if nc -z db 3306; then
                    echo "Database is ready!"
                    DB_READY=true
                    break
                fi
            else
                # Fall back to a simple sleep if no network utilities are available
                echo "Network tools not available, waiting additional time for database initialization"
                sleep 10
                DB_READY=true
                break
            fi
        fi
    fi
    echo "Waiting for database connection... ($i/30)"
    sleep 2
done

if [ "$DB_READY" = false ]; then
    echo "WARNING: Could not confirm database is ready, but continuing anyway..."
fi

# Add a fixed delay to ensure the database is fully ready
echo "Adding an additional delay to ensure database readiness..."
sleep 10

# List directories to verify everything exists
echo "Listing key directories and files:"
echo "Configuration directory:"
ls -la /opt/mirthconnect/conf/
echo "Keystore directory:"
ls -la /opt/mirthconnect/keystore/
echo "Keystore file properties:"
keytool -list -v -keystore /opt/mirthconnect/keystore/keystore.jks -storepass changeme | head -20
echo "mirth.properties content:"
cat /opt/mirthconnect/conf/mirth.properties

echo "Entrypoint script completed, starting Mirth Connect..."
exec "$@"