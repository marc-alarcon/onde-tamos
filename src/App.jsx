import React, { useState, useEffect, useRef } from 'react';
import { Viewer } from 'mapillary-js';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LOCATIONS } from './locations';

// Token de Mapillary - ¡PON EL TUYO AQUÍ!
const MAPILLARY_TOKEN = "MLY|26704725642530225|aab6832ebb6ee8c2b504116630899cec";

// Arreglar el icono del marcador
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Función matemática de Haversine
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calcularPuntuacion(distanciaKm) {
  if (distanciaKm < 0.1) return 5000;
  const puntos = Math.round(5000 * Math.exp(-distanciaKm / 100));
  return Math.max(0, puntos);
}

// NUEVO: Componente para que el mapa haga zoom automático y muestre los dos pines
function MapFitter({ guess, actual }) {
  const map = useMap();
  useEffect(() => {
    if (guess && actual) {
      const bounds = L.latLngBounds([guess, actual]);
      // Añadimos un padding para que los pines no queden pegados al borde
      map.fitBounds(bounds, { padding: [50, 50] }); 
    }
  }, [map, guess, actual]);
  return null;
}

export default function App() {
  const [gameState, setGameState] = useState('inicio'); 
  const [round, setRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userGuess, setUserGuess] = useState(null); 
  const mlyViewerRef = useRef(null);

  const currentSpecification = LOCATIONS[round];

  // Iniciar visor de Mapillary
  useEffect(() => {
    if (gameState === 'jugando' && currentSpecification) {
      // Un pequeño retraso para asegurar que el div del mapa existe antes de inyectar Mapillary
      setTimeout(() => {
        if (mlyViewerRef.current) {
          mlyViewerRef.current.remove();
        }
        mlyViewerRef.current = new Viewer({
          container: 'mly',
          accessToken: MAPILLARY_TOKEN,
          imageId: currentSpecification.mapillaryId,
          component: { cover: false }
        });
      }, 100);
    }
  }, [gameState, round]);

  function MapEvents() {
    useMapEvents({
      click(e) {
        if (gameState === 'jugando') {
          setUserGuess([e.latlng.lat, e.latlng.lng]);
        }
      },
    });
    return null;
  }

  const handleGuess = () => {
    if (!userGuess) return;
    const dist = calcularDistancia(
      currentSpecification.lat, currentSpecification.lng,
      userGuess[0], userGuess[1]
    );
    const puntos = calcularPuntuacion(dist);
    
    setDistance(dist);
    setRoundScore(puntos);
    setTotalScore(prev => prev + puntos);
    setGameState('resultado');
  };

  const handleNextRound = () => {
    setUserGuess(null);
    if (round < LOCATIONS.length - 1) {
      setRound(prev => prev + 1);
      setGameState('jugando');
    } else {
      setGameState('final');
    }
  };

  const reiniciarJuego = () => {
    setRound(0);
    setTotalScore(0);
    setUserGuess(null);
    setGameState('inicio');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans bg-slate-900 text-white flex flex-col">
      
      {gameState === 'inicio' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-900">
          <h1 className="text-5xl md:text-7xl font-black text-amber-400 mb-2">¿Onde tamô?</h1>
          <p className="text-xl mb-8">El juego de adivinar mapas con arte andaluz.</p>
          <button onClick={() => setGameState('jugando')} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xl rounded-xl cursor-pointer">
            ¡Echá una partida!
          </button>
        </div>
      )}

      {/* VISTA DE JUEGO NORMAL */}
      {gameState === 'jugando' && (
        <div className="w-full h-full relative">
          <div id="mly" className="w-full h-full bg-slate-800"></div>

          <div className="absolute top-4 left-4 z-40 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-700 pointer-events-none">
            <p className="text-xs text-amber-400 font-bold">RONDA</p>
            <p className="text-xl font-black">{round + 1} / {LOCATIONS.length}</p>
            <p className="text-xs text-slate-400">Puntos: <span className="text-white">{totalScore}</span></p>
          </div>

          <div className="absolute bottom-4 right-4 z-40 bg-slate-950/90 border border-slate-700 p-2 rounded-2xl w-72 h-72 md:w-[400px] md:h-[350px] shadow-2xl flex flex-col">
            <MapContainer center={[37.38, -5.98]} zoom={6} className="w-full flex-grow rounded-xl z-0">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapEvents />
              {userGuess && <Marker position={userGuess} />}
            </MapContainer>

            <button disabled={!userGuess} onClick={handleGuess} className={`w-full mt-2 py-2 rounded-xl font-bold transition ${userGuess ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-500'}`}>
              {userGuess ? '¡Votá aquí!' : 'Pincha en el mapa'}
            </button>
          </div>
        </div>
      )}

      {/* NUEVA VISTA DE RESULTADOS (ESTILO GEOGUESSR) */}
      {gameState === 'resultado' && (
        <div className="w-full h-full flex flex-col bg-slate-100 text-slate-900">
          
          {/* MAPA GIGANTE ARRIBA */}
          <div className="flex-grow w-full relative z-0">
            <MapContainer center={[37.38, -5.98]} zoom={6} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Marcador del jugador (Amarillo en la realidad, aquí usamos el por defecto) */}
              <Marker position={userGuess} />
              
              {/* Marcador Real (A donde tenías que haber pinchado) */}
              <Marker position={[currentSpecification.lat, currentSpecification.lng]} />
              
              {/* Línea que une ambos puntos */}
              <Polyline 
                positions={[userGuess, [currentSpecification.lat, currentSpecification.lng]]} 
                color="#64748b" // color gris oscuro
                weight={3} 
                dashArray="5, 10" // línea punteada
              />

              {/* El componente que hace que la cámara encuadre los dos puntos a la vez */}
              <MapFitter guess={userGuess} actual={[currentSpecification.lat, currentSpecification.lng]} />
            </MapContainer>
          </div>

          {/* PANEL DE PUNTUACIÓN ABAJO */}
          <div className="h-48 md:h-64 flex flex-col items-center justify-center p-4 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-10">
            <p className="text-lg md:text-2xl mb-2 text-center">
              Tu suposición estaba a <strong className="font-black text-slate-900">{distance.toFixed(1)} km</strong> de la ubicación correcta.
            </p>
            
            {/* Barra de progreso de puntos visual (opcional, le da toque profesional) */}
            <div className="w-full max-w-2xl bg-slate-200 rounded-full h-4 mb-4 overflow-hidden relative">
              <div 
                className="bg-amber-500 h-4 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${(roundScore / 5000) * 100}%` }}
              ></div>
            </div>

            <p className="text-xl mb-6">Has conseguido <strong className="text-amber-500 text-2xl">{roundScore}</strong> puntos</p>
            
            <button onClick={handleNextRound} className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg uppercase tracking-wide cursor-pointer shadow-md transition transform hover:-translate-y-1">
               {round === LOCATIONS.length - 1 ? 'Ver Resumen Final' : 'Siguiente Ronda'}
            </button>
          </div>
        </div>
      )}

      {/* PANTALLA FINAL DE PARTIDA */}
      {gameState === 'final' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950">
          <h2 className="text-4xl font-black text-center mb-2 text-slate-100">Partida Terminada</h2>
          <p className="text-6xl font-black text-amber-400 my-4">{totalScore} <span className="text-2xl text-slate-400">/ 25000</span></p>
          <button onClick={reiniciarJuego} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer">
            Jugar otra vez
          </button>
        </div>
      )}
    </div>
  );
}