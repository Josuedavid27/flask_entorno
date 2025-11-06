Un entorno virtual en Python es una herramienta fundamental que sirve para aislar las dependencias y paquetes de cada uno de tus proyectos. Esto evita conflictos entre las diferentes versiones de bibliotecas que puedas necesitar. 

Evitar conflictos entre proyectos: Puedes trabajar en varios proyectos a la vez que requieren diferentes versiones de una misma biblioteca (por ejemplo, matplotlib 2.2 para un proyecto y matplotlib 3.5 para otro) sin que se afecten entre sí.

Mantener el entorno base limpio: Las librerías que instales dentro del entorno virtual no se mezclarán con tu instalación principal de Python, que se mantendrá limpia y estable.

Garantizar la reproducibilidad: Si trabajas con otras personas, o necesitas mover tu proyecto a otro equipo, el entorno virtual asegura que el código funcione exactamente igual en cualquier lugar. Puedes exportar una lista de los paquetes necesarios para que otros desarrolladores los instalen fácilmente.

Permitir versiones de Python diferentes: Puedes tener múltiples entornos virtuales usando distintas versiones de Python, lo que es útil si necesitas probar tu código en versiones anteriores.

Facilitar la gestión de paquetes: Controlas qué paquetes se instalan y cuándo se actualizan para cada proyecto específico, sin riesgo de romper otras aplicaciones en tu sistema. 

# Como instalar un entorno virtual en tu proyecto

python -m venv venv **(Para crear la carpeta del entorno, se puede cambiar el nombre Venv)**

.\venv\Scripts\activate **(Para entrar al entorno virtual o activar el entorno virtual)**

(venv) PS C:\Users\Joss\Desktop\flask_entorno> **Cuando se active se ve algo asi, depende de la estructura de tus carpetas y nombre de dichas**

pip install flask **Instalar Flask**
pip freeze > requirements.txt **Crear archivo donde se guardaran todas las dependencias instaladas**
pip install -r requirements.txt **Para actualizar**
pip list **(Ver todos los paquetes instalados dentro del entorno)**
pip freeze > requirements.txt **(Crear o actualizar el archivo donde se guardaran los paquetes)**


python app.py **(Para ejecutar de manera local en el navegador)**
