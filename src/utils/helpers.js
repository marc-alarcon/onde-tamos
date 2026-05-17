// src/utils/helpers.js

// Fórmula matemática de Haversine para calcular distancia en km entre dos coordenadas
export function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Función para calcular los puntos de 0 a 5000 basado en la distancia
export function calcularPuntuacion(distanciaKm) {
  if (distanciaKm < 0.1) return 5000; // Menos de 100 metros es puntuación perfecta
  const puntos = Math.round(5000 * Math.exp(-distanciaKm / 100));
  return Math.max(0, puntos);
}