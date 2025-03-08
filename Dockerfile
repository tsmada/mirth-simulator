FROM eclipse-temurin:8-jre

RUN apt-get update && apt-get install -y --no-install-recommends \
    unzip \
    curl \
    tar \
    gzip \
    locales \
    netcat-openbsd \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/* \
    && sed -i 's/^# *\(en_US.UTF-8\)/\1/' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# Create mirth user
RUN useradd -u 1001 mirth

# Copy installer
COPY mirthconnect-3.1.0.7420.b1421-unix.sh /tmp/

# Run installer in non-interactive mode
RUN chmod +x /tmp/mirthconnect-3.1.0.7420.b1421-unix.sh && \
    printf "o\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n1\n/opt/mirthconnect\ny\n1,2\ny\n/usr/local/bin\n8080\n8443\n1\n1\n1\n1\n1\n/opt/mirthconnect/appdata\n/opt/mirthconnect/logs\ny\nya\ny\nn\n" | /tmp/mirthconnect-3.1.0.7420.b1421-unix.sh && \
    rm /tmp/mirthconnect-3.1.0.7420.b1421-unix.sh

# Create required directories
RUN mkdir -p /opt/mirthconnect/appdata \
    && mkdir -p /opt/mirthconnect/custom-extensions \
    && mkdir -p /opt/mirthconnect/conf

# Create keystore.jks in the correct location with the standard password
RUN mkdir -p /opt/mirthconnect/keystore && \
    keytool -genkey -keyalg RSA -alias mirthconnect -keystore /opt/mirthconnect/keystore/keystore.jks \
    -storepass changeme -keypass changeme -validity 3650 \
    -dname "CN=Mirth Connect, OU=Mirth, O=Mirth Corp, L=Dallas, ST=TX, C=US"

# Create a MySQL-specific mirth.properties with the default keystore password
RUN echo "# Mirth Connect configuration file" > /opt/mirthconnect/conf/mirth.properties && \
    echo "database = mysql" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "database.url = jdbc:mysql://db:3306/mirthdb?useSSL=false" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "database.driver = com.mysql.jdbc.Driver" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "database.username = mirth" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "database.password = mirthpassword" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "keystore.storepass = changeme" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "keystore.keypass = changeme" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "keystore.path = /opt/mirthconnect/keystore/keystore.jks" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "http.port = 8080" >> /opt/mirthconnect/conf/mirth.properties && \
    echo "https.port = 8443" >> /opt/mirthconnect/conf/mirth.properties

# Download MySQL connector
RUN mkdir -p /opt/mirthconnect/lib/custom-lib/ \
    && mkdir -p /opt/mirthconnect/server-lib/custom-lib/
ADD https://repo1.maven.org/maven2/mysql/mysql-connector-java/5.1.49/mysql-connector-java-5.1.49.jar /opt/mirthconnect/lib/custom-lib/
RUN cp /opt/mirthconnect/lib/custom-lib/mysql-connector-java-5.1.49.jar /opt/mirthconnect/server-lib/custom-lib/ \
    && chmod 644 /opt/mirthconnect/lib/custom-lib/mysql-connector-java-5.1.49.jar \
    && chmod 644 /opt/mirthconnect/server-lib/custom-lib/mysql-connector-java-5.1.49.jar

# Set up volumes and working directory
VOLUME /opt/mirthconnect/appdata
VOLUME /opt/mirthconnect/custom-extensions
WORKDIR /opt/mirthconnect

# Create base vmoptions file
RUN echo "-Xmx512m" > /opt/mirthconnect/mcserver_base.vmoptions && \
    cp /opt/mirthconnect/mcserver_base.vmoptions /opt/mirthconnect/mcserver.vmoptions

# Expose the default Mirth Connect port
EXPOSE 8443
EXPOSE 8080

# Copy entrypoint script
COPY entrypoint.sh /
RUN chmod 755 /entrypoint.sh

# Set ownership and permissions
RUN chown -R mirth:mirth /opt/mirthconnect
USER mirth

ENTRYPOINT ["/entrypoint.sh"]
CMD ["sh", "-c", "if [ -f /opt/mirthconnect/mcserver ]; then /opt/mirthconnect/mcserver; elif [ -f /opt/mirthconnect/mirth-server-launcher.jar ]; then java -jar /opt/mirthconnect/mirth-server-launcher.jar; else echo 'Cannot find Mirth Connect launcher'; exit 1; fi"]