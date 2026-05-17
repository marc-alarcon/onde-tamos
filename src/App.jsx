import React, { useState, useEffect, useRef } from 'react';
import { Viewer } from 'mapillary-js';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { LOCATIONS } from './locations';

// Token de Mapillary - ¡PON EL TUYO AQUÍ!
const MAPILLARY_TOKEN = "MLY|26704725642530225|aab6832ebb6ee8c2b504116630899cec";

// Arreglar el icono del marcador de Leaflet que a veces desaparece en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Fórmula matemática para calcular distancia en km entre dos coordenadas (Haversine)
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Función para calcular los puntos de 0 a 5000 basado en la distancia
function calcularPuntuacion(distanciaKm) {
  if (distanciaKm < 0.1) return 5000; // Menos de 100 metros es puntuación perfecta
  // A más distancia, menos puntos. A partir de 500km da casi 0 puntos.
  const puntos = Math.round(5000 * Math.exp(-distanciaKm / 100));
  return Math.max(0, puntos);
}

export default function App() {
  const [gameState, setGameState] = useState('inicio'); // inicio, jugando, resultado, final
  const [round, setRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [distance, setDistance] = useState(0);
  
  const [userGuess, setUserGuess] = useState(null); // Coordenadas donde hace clic el usuario
  const mlyViewerRef = useRef(null);

  const currentSpecification = LOCATIONS[round];

  // Iniciar el visor de Mapillary cuando empieza la ronda
  useEffect(() => {
    if (gameState === 'jugando' && currentSpecification) {
      if (mlyViewerRef.current) {
        mlyViewerRef.current.remove();
      }
      
      mlyViewerRef.current = new Viewer({
        container: 'mly',
        accessToken: MAPILLARY_TOKEN,
        imageId: currentSpecification.mapillaryId,
        component: { cover: false }
      });
    }

    return () => {
      if (mlyViewerRef.current && gameState === 'final') {
        mlyViewerRef.current.remove();
      }
    };
  }, [gameState, round]);

  // Componente interno para capturar el clic en el minimapa
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
    <div className="relative w-screen h-screen overflow-hidden font-sans bg-slate-900 text-white">
      
      {/* PANTALLA DE INICIO */}
      {gameState === 'inicio' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-900/95">
          <h1 className="text-5xl md:text-7xl font-black text-amber-400 text-center tracking-tight mb-2">
            ¿Onde tamô?
          </h1>
          <p className="text-xl text-slate-300 text-center max-w-md mb-8 italic">
            El GeoGuessr gratuito, con arte andaluz. ¿Serás capaz de ubicarte en el mapa?
          </p>
          <button 
            onClick={() => setGameState('jugando')}
            className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xl rounded-xl shadow-lg transition transform hover:scale-105 cursor-pointer">
            ¡Echá una partida!
          </button>
        </div>
      )}

      {/* JUEGO EN PROGRESO (VISOR DE CALLE) */}
      {(gameState === 'jugando' || gameState === 'resultado') && (
        <div className="w-full h-full relative">
          {/* Contenedor de Mapillary 360 */}
          <div id="mly" className="w-full h-full bg-slate-800"></div>

          {/* Marcador superior de Ronda y Puntos */}
          <div className="absolute top-4 left-4 z-40 bg-slate-950/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 pointer-events-none">
            <p className="text-xs text-amber-400 uppercase font-bold tracking-wider">Ronda</p>
            <p className="text-xl font-black">{round + 1} / {LOCATIONS.length}</p>
            <p className="text-xs text-slate-400 mt-1">Puntos totales: <span className="text-white font-bold">{totalScore}</span></p>
          </div>

          {/* MINIMAPA FLOTANTE PARA ADIVINAR */}
          <div className="absolute bottom-4 right-4 z-40 bg-slate-950/90 border border-slate-700 p-2 rounded-2xl shadow-2xl transition-all duration-300 w-72 h-72 md:w-96 md:h-96">
            <MapContainer 
              center={[37.38, -5.98]} 
              zoom={6} 
              className="w-full h-[75%] rounded-xl"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapEvents />
              {userGuess && <Marker position={userGuess} />}
              
              {/* Si estamos mostrando el resultado, pintar también la bandera real */}
              {gameState === 'resultado' && (
                <Marker position={[currentSpecification.lat, currentSpecification.lng]} />
              )}
            </MapContainer>

            {/* BOTONERAS DEL MINIMAPA */}
            <div className="h-[25%] flex flex-col justify-center items-center pt-2">
              {gameState === 'jugando' ? (
                <button
                  disabled={!userGuess}
                  onClick={handleGuess}
                  className={`w-full py-2 rounded-xl font-bold text-center transition ${
                    userGuess 
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {userGuess ? '¡Votá aquí!' : 'Pincha en el mapa'}
                </button>
              ) : (
                <div className="w-full text-center">
                  <p className="text-xs text-slate-300">
                    Estaba a <span className="text-amber-400 font-bold">{distance.toFixed(1)} km</span>. ¡Te llevas <span className="text-green-400 font-bold">{roundScore}</span> ptos!
                  </p>
                  <button
                    onClick={handleNextRound}
                    className="w-full mt-1 py-1.5 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-lg text-sm cursor-pointer"
                  >
                    {round === LOCATIONS.length - 1 ? 'Ver puntuación final' : 'Siguiente Ronda'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA FINAL DE PARTIDA */}
      {gameState === 'final' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950">
          <h2 className="text-4xl font-black text-center mb-2 text-slate-100">Partida Terminada</h2>
          <p className="text-6xl font-black text-amber-400 my-4 tracking-tight">{totalScore} <span className="text-2xl text-slate-400">/ 25000</span></p>
          
          <p className="text-lg text-slate-400 text-center max-w-md mb-8">
            {totalScore > 20000 ? "¡Ojú, qué arte! Te conoces Andalucía como la palma de tu mano." : 
             totalScore > 10000 ? "Ni tan mal, te ubicas bien, pero te falta carretera." : 
             "Te has perdío tres pueblos... ¡Hay que viajar más!"}
          </p>

          <button 
            onClick={reiniciarJuego}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition cursor-pointer">
            Jugar otra vez
          </button>
        </div>
      )}

    </div>
  );
}