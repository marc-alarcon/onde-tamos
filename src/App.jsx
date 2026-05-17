// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Viewer } from 'mapillary-js';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Importamos los datos y las funciones matemáticas separadas
import { LOCATIONS } from './locations';
import { calcularDistancia, calcularPuntuacion } from './utils/helpers';

// Token de Mapillary - ¡PON EL TUYO AQUÍ!
const MAPILLARY_TOKEN = import.meta.env.VITE_MAPILLARY_TOKEN;

// --- CONFIGURACIÓN DE LOS PINES DEL MAPA ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Pin azul por defecto (para el usuario)
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Pin verde personalizado (para la ubicación real)
const CorrectIcon = L.divIcon({
  className: 'bg-transparent border-0',
  html: `<div class="w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});
// -------------------------------------------

// Componente para encuadrar los dos pines automáticamente en la pantalla de resultados
function MapFitter({ guess, actual }) {
  const map = useMap();
  useEffect(() => {
    if (guess && actual) {
      const bounds = L.latLngBounds([guess, actual]);
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

  // Capturar clics en el mapa
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

  // Lógica al pulsar "Votar"
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

  // Pasar a la siguiente ronda
  const handleNextRound = () => {
    setUserGuess(null);
    if (round < LOCATIONS.length - 1) {
      setRound(prev => prev + 1);
      setGameState('jugando');
    } else {
      setGameState('final');
    }
  };

  // Reiniciar partida
  const reiniciarJuego = () => {
    setRound(0);
    setTotalScore(0);
    setUserGuess(null);
    setGameState('inicio');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans bg-slate-900 text-white flex flex-col">
      
      {/* PANTALLA DE INICIO */}
      {gameState === 'inicio' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-900">
          <h1 className="text-5xl md:text-7xl font-black text-amber-400 mb-2">¿Onde tamô?</h1>
          <p className="text-xl mb-8">El juego de adivinar mapas con arte andaluz.</p>
          <button onClick={() => setGameState('jugando')} className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xl rounded-xl cursor-pointer transition transform hover:scale-105">
            ¡Echá una partida!
          </button>
        </div>
      )}

      {/* VISTA DE JUEGO (VISOR 360 + MINIMAPA) */}
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

      {/* VISTA DE RESULTADOS (MAPA GRANDE CON LÍNEA) */}
      {gameState === 'resultado' && (
        <div className="w-full h-full flex flex-col bg-slate-100 text-slate-900">
          
          <div className="flex-grow w-full relative z-0">
            <MapContainer center={[37.38, -5.98]} zoom={6} className="w-full h-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              
              {/* Marcador del jugador (Azul) */}
              <Marker position={userGuess} />
              
              {/* Marcador Real (Verde) */}
              <Marker position={[currentSpecification.lat, currentSpecification.lng]} icon={CorrectIcon} />
              
              {/* Línea conectora */}
              <Polyline positions={[userGuess, [currentSpecification.lat, currentSpecification.lng]]} color="#64748b" weight={3} dashArray="5, 10" />

              <MapFitter guess={userGuess} actual={[currentSpecification.lat, currentSpecification.lng]} />
            </MapContainer>
          </div>

          <div className="h-48 md:h-64 flex flex-col items-center justify-center p-4 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-10">
            <p className="text-lg md:text-2xl mb-2 text-center">
              Tu suposición estaba a <strong className="font-black text-slate-900">{distance.toFixed(1)} km</strong> de la ubicación correcta.
            </p>
            
            <div className="w-full max-w-2xl bg-slate-200 rounded-full h-4 mb-4 overflow-hidden relative">
              <div className="bg-amber-500 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${(roundScore / 5000) * 100}%` }}></div>
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
          <button onClick={reiniciarJuego} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer transition transform hover:scale-105">
            Jugar otra vez
          </button>
        </div>
      )}
    </div>
  );
}