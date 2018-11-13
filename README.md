# Ejercicio 10

## Introducción

Hemos avanzado mucho en la construcción de un sistema robusto. Tenemos réplicas, eventos, sistemas de colas, alta disponibilidad... pero a pesar de todo, aún podemos tener problemas graves en nuestro servicio. Los servicios de los que depende pueden saturarse por diferentes motivos: fallos, exceso de carga, etc.
Como hemos visto, incluso en estas situaciones se pueden emplear algunas técnicas para paliar o minimizar los problemas. En este ejercicio vamos a trabajar en un par de casos prácticos, y aplicaremos mecanismos de backpressure.

### 1 - Actualizar el servicio externo

Para este ejercicio, vamos a utilizar una versión diferente de `messageapp`.
Esta versión nos permitirá simular los problemas que queremos mitigar.

Para ello, tendremos que modificar la imagen de `messageapp` en el `docker-compose.yml` por `cabify/backend-bootcamp-messageapp:exercise10`.

### 2 - Circuit breaker

Como se puede ver la nueva versión de `messageapp` tiene un problema: los tiempos de respuesta en general funcionan bien, pero hay momentos en los que los tiempos de respuesta crecen enormemente. Este comportamiento es bastante habitual en situaciones de saturación: los tiempos de respuesta se incrementan indefinidamente, realimentando el problema. Por ello, una de las formas más eficientes de restaurar el comportamiento adecuado del servicio degradado es dejar de hacer peticiones para aliviar la carga. Eso es lo que vamos a hacer en este ejercicio.

Los pasos que debemos implementar en nuestro código son:

1. Si aún no estamos gestionando el timeout asociado a la request del servicio externo, debemos implementarlo.
   Podemos poner, p. ej. 1s de timeout: si tras 1s la petición a messageapp no ha respondido, cerramos la conexión y consideramos que la petición ha fallado.
2. A continuación debemos buscar una librería que implemente la funcionalidad de un circuit breaker.
   Debemos integrarla en la llamada que hacemos a `messageapp` desde nuestro servicio.
   Configuradla para que con un número reducido de fallos abra el circuito.
3. Las peticiones ahora pueden fallar por, al menos, 3 motivos:
   - `messageapp` ha dado un error
   - `messageapp` ha tardado demasiado y nos ha saltado un timeout
   - el circuito se ha abierto y no hemos llegado a hacer la petición al servicio externo.
   Deberíamos poder diferenciar los 3 casos (con un mensaje por pantalla por ejemplo),
4. Comprobar con un cliente de nuestro API llegamos a ver los 3 tipos de errores en el log del servicio.

### 3 - Tamaño de la cola

Los problemas de saturación suelen anidarse y, en nuestro caso, es lo que va a suceder.
Dado que no podemos enviar mensajes al servicio externo cuando se abre el circuito, los mensajes se nos acumularán en la cola.
Esto está bien, porque nos resuelve el problema de manera puntual, pero si el problema persiste, la cola crecerá, en principio indefinidamente.
Los problemas derivados de un crecimiento indefinido pueden agravar la situación y afectar a otros componentes.
Por ejemplo, un crecimiento indefinido puede suponer consumir toda la memoria de un servidor, causando que todos los componentes del servidor fallen.
Para evitar estos problemas, vamos a implementar un sencillo sistema de backpressure en la cola.

1. Definir unos umbrales de tamaño de cola en variables de entorno. Por ejemplo, un tamaño máximo de 10 mensajes y un umbral de recuperación de 5.
2. Modificar el código del servicio que publica mensajes en la cola para que, antes de publicar, compruebe el tamaño de la cola.
   Si la cola alcanza el máximo de mensajes, dejan de publicarse nuevos mensajes y se devuelve un error.
   Cada petición que llegue a partir de ese momento para publicar mensajes fallará, hasta que el tamaño de la cola se reduzca al umbral de recuperación.
   Una vez alcanzado el umbral de recuperación, se vuelve a activar la publicación hasta alcanzar el tamaño máximo de nuevo, y así indefinidamente.
3. Imprimir un mensaje de log cuando se activa / desactiva la publicación en la cola.
4. Comprobar con un cliente de nuestro API que llegamos a ver estas transiciones. Podemos jugar con el tamaño máximo y el umbral de recuperación para ver las diferencias.
   Deberíamos poder ver cómo se produce todo el proceso: empiezan a aparecer errores en el servicio externo, se abre el circuito, se llena la cola,
   y dejan de publicarse los mensajes... hasta que se vuelve a recuperar el servicio y el sistema vuelve a la normalidad.

Además de ver que nuestro componente responde adecuadamente, debemos asegurarnos que el cliente de nuestro API también recibe un error diferenciado para este caso.
Esto permitiría a los clientes del servicio a su vez abrir el circuito en caso de ser necesario, y no hacer peticiones a nuestro servico que van a ser rechazadas.
