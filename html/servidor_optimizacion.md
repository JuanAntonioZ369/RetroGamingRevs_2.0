# Guía de Optimización del Servidor Netplay (Lima - 38.250.116.33)

## Estado actual detectado
- **Ping desde cliente:** ~9ms (excelente)
- **Puerto 55435 TCP:** CERRADO — el tunnel server no está corriendo o el firewall lo bloquea

---

## PASO 1 — Verificar que el tunnel server esté corriendo

```bash
# Ver si el proceso está activo
ps aux | grep netplay

# Ver si el puerto 55435 está escuchando
ss -tlnp | grep 55435

# Si no aparece nada, el server no está corriendo → ir al Paso 2
```

---

## PASO 2 — Instalar y compilar el tunnel server

```bash
# Instalar dependencias
sudo apt update
sudo apt install -y git build-essential

# Clonar el repo
git clone https://github.com/libretro/netplay-tunnel-server.git
cd netplay-tunnel-server

# Compilar
make

# Verificar que compiló
ls -la server
```

---

## PASO 3 — Configurar el firewall (CRÍTICO)

El puerto 55435 TCP debe estar abierto. Con UFW:
```bash
sudo ufw allow 55435/tcp
sudo ufw allow 55435/udp
sudo ufw reload
sudo ufw status
```

Con iptables directamente:
```bash
sudo iptables -A INPUT -p tcp --dport 55435 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 55435 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

Si el servidor está en un proveedor cloud (AWS, GCP, Oracle, etc.),
también abrir el puerto 55435 TCP/UDP en el Security Group / Firewall del panel web.

---

## PASO 4 — Verificar TCP_NODELAY en el código fuente

El algoritmo de Nagle agrupa paquetes pequeños y puede agregar hasta 200ms de delay.
Verificar que el tunnel server lo desactiva:

```bash
grep -r "TCP_NODELAY" ~/netplay-tunnel-server/
```

Si NO aparece, editar el archivo donde se aceptan conexiones (generalmente `server.c` o `main.c`)
y agregar esto inmediatamente después de cada `accept()`:

```c
int flag = 1;
setsockopt(client_fd, IPPROTO_TCP, TCP_NODELAY, (char *)&flag, sizeof(flag));
```

Luego recompilar con `make`.

---

## PASO 5 — Tuning del kernel TCP (como root)

Aplicar y hacer permanentes las optimizaciones de red:

```bash
# Aplicar en caliente
sysctl -w net.ipv4.tcp_nodelay=1
sysctl -w net.ipv4.tcp_tw_reuse=1
sysctl -w net.ipv4.tcp_fin_timeout=15
sysctl -w net.core.rmem_max=4194304
sysctl -w net.core.wmem_max=4194304
sysctl -w net.ipv4.tcp_rmem="4096 87380 4194304"
sysctl -w net.ipv4.tcp_wmem="4096 65536 4194304"

# Hacer permanentes (sobreviven reboots)
cat >> /etc/sysctl.conf << 'EOF'
net.ipv4.tcp_nodelay=1
net.ipv4.tcp_tw_reuse=1
net.ipv4.tcp_fin_timeout=15
net.core.rmem_max=4194304
net.core.wmem_max=4194304
net.ipv4.tcp_rmem=4096 87380 4194304
net.ipv4.tcp_wmem=4096 65536 4194304
EOF

sysctl -p
```

---

## PASO 6 — Ejecutar el tunnel server como servicio

### Opción A: Correr manualmente (para pruebas)
```bash
cd ~/netplay-tunnel-server
./server --port 55435
```

### Opción B: Servicio systemd (recomendado para producción)
```bash
# Crear el archivo de servicio
sudo nano /etc/systemd/system/netplay-tunnel.service
```

Pegar este contenido:
```ini
[Unit]
Description=RetroArch Netplay Tunnel Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/netplay-tunnel-server
ExecStart=/root/netplay-tunnel-server/server --port 55435
Restart=always
RestartSec=5
Nice=-10

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable netplay-tunnel
sudo systemctl start netplay-tunnel

# Verificar estado
sudo systemctl status netplay-tunnel
```

---

## PASO 7 — Verificar desde Windows que funciona

Ejecutar en PowerShell:
```powershell
Test-NetConnection -ComputerName 38.250.116.33 -Port 55435
# TcpTestSucceeded debe ser: True
```

---

## PASO 8 — Monitorear el servidor en tiempo real

```bash
# Ver conexiones activas al tunnel server
watch -n 1 "ss -tnp | grep 55435"

# Ver logs del servicio
journalctl -u netplay-tunnel -f

# Ver uso de CPU/red del proceso
top -p $(pidof server)
```

---

## Resumen de prioridades

| Prioridad | Acción | Impacto |
|---|---|---|
| URGENTE | Abrir puerto 55435 TCP en firewall | Sin esto no funciona el tunnel |
| URGENTE | Iniciar el tunnel server | Sin esto no funciona el tunnel |
| ALTA | Verificar TCP_NODELAY en el código | Puede añadir hasta 200ms de lag |
| ALTA | Tuning sysctl TCP | Mejora general de latencia |
| MEDIA | Configurar como servicio systemd | Estabilidad en producción |

---

## Notas sobre los valores RetroArch actuales

Con 9ms de ping al servidor (excelente), los valores en `retroarch.cfg` ya están optimizados:
- `netplay_check_frames = 8` → cubre RTT hasta 133ms (más que suficiente para 9ms)
- `netplay_input_latency_frames_min = 2` → 33ms de latencia intencional (ajustar a 1 si la conexión es siempre estable)
