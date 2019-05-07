
# pChat

pChat es una aplicación de chat escrita con electron en la que podrás enviar todo tipo de mensajes sin limitaciones, imagenes, archivos, menciones de usuarios, etc.

Soporte para Win 7 hasta Win 10

  

## Características

- Configuración de usuario personalizada

- Diseño UI moderno y amigable

- Limite de envío de archivos de hasta 20 MB

- Vista previa de imágenes

- Menciones de usuarios con alertas de notitificación

- etc...

  

## Imágenes

![Login View](https://i.imgur.com/oM0M3HW.png)

![General View](https://i.imgur.com/4BjigmK.png)

![Config View](https://i.imgur.com/75uLqRx.png)

  

## Servidor

El servidor de pChat esta escrito bajo nodeJS y se encuentra disponible en la carpeta "server/", puede estar hosteado remotamente y localmente.

- Puerto por defecto: 1234

> node server.js -p port_num

  

## Dependencias

- socket.io - https://socket.io/

- electron 5.0 - https://electronjs.org/

- jQuery - https://jquery.com/

- jimp - https://github.com/oliver-moran/jimp

- electron-windows-badge - https://github.com/viktor-shmigol/electron-windows-badge