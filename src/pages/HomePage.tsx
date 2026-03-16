import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import CheckIn from '../components/CheckIn';
import Roulette from '../components/Roulette';
import { TrendingUp, Users, Wallet, Loader2 } from 'lucide-react';

import { db } from "../firebase/firebase"; 
import { collection, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';

// Componente para a animação de contagem
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const start = previousValue.current;
    const end = value;
    if (start === end) return;

    const duration = 1000; // 1 segundo de animação
    const startTime = performance.now();

    const updateNumber = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Efeito de desaceleração (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateNumber);
      } else {
        previousValue.current = end;
      }
    };

    requestAnimationFrame(updateNumber);
  }, [value]);

  return <span>R$ {displayValue.toFixed(2)}</span>;
};

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    todayEarnings: 0, 
    totalInvites: 0,
    allTimeEarnings: 0,
    currentBalance: 0 // Nova stat para pegar direto do banco
  });
  const [loading, setLoading] = useState(true);

  const fetchHomeStats = async (userId: string) => {
    try {
      // 1. Busca os dados mais recentes do usuário diretamente no Firestore
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.data();

      // 2. Total de Convidados
      const qTeam = query(collection(db, 'users'), where('referredBy', '==', userId));
      const teamSnap = await getDocs(qTeam);
      
      // 3. Cálculo de Ganhos de Hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = Timestamp.fromDate(today);

      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const querySnapshot = await getDocs(transactionsRef);

      let todayTotal = 0;
      // Garanta que os nomes aqui batem exatamente com o 'type' salvo pelas suas funções
      const earningTypes = ['commission', 'roulette', 'investment', 'checkin', 'daily_return'];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const amount = Number(data.amount || 0);
        const type = data.type;
        const createdAt = data.createdAt;

        if (earningTypes.includes(type) && amount > 0) {
          if (createdAt && createdAt.seconds >= startOfToday.seconds) {
            todayTotal += amount;
          }
        }
      });

      // Atualiza todos os valores com base no banco
      setStats({
        todayEarnings: todayTotal,
        totalInvites: teamSnap.size,
        allTimeEarnings: Number(userData?.totalEarned || 0),
        currentBalance: Number(userData?.balance || 0) // Usa o saldo do banco, não do contexto
      });
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Primeira busca assim que entra
      fetchHomeStats(user.id);
    }
  }, [user?.id]);

  if (!user) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#22c55e]"/></div>;

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm">Bem-vindo de volta</p>
          <h1 className="text-xl font-bold text-white">{user.email?.split('@')[0]}</h1>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-full flex items-center justify-center">
          <span className="text-xl font-bold text-white">{user.email?.charAt(0).toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#111111]/80 border-[#1a1a1a]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#22c55e]" />
              <span className="text-gray-400 text-sm">Ganhos Hoje</span>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">
              <AnimatedNumber value={stats.todayEarnings} />
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111111]/80 border-[#1a1a1a]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#22c55e]" />
              <span className="text-gray-400 text-sm">Equipe</span>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">{stats.totalInvites}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Balance Card */}
      <Card className="bg-[#111111]/80 border-[#22c55e]/30 shadow-lg shadow-[#22c55e]/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
            <Wallet className="w-5 h-5 text-[#22c55e]" /> Saldo Disponível
          </div>
          <p className="text-3xl font-extrabold text-white mb-3">
            {/* Agora ele usa o currentBalance lido direto do banco */}
            <AnimatedNumber value={stats.currentBalance} />
          </p>
          <div className="pt-3 border-t border-[#1a1a1a] flex justify-between text-sm">
            <span className="text-gray-500">Total Ganhos (Geral)</span>
            <span className="text-[#22c55e] font-semibold">
              <AnimatedNumber value={stats.allTimeEarnings} />
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#111111]/80 border-[#1a1a1a]">
        <CardContent className="pt-6">
          <CheckIn onCheckInComplete={() => fetchHomeStats(user.id)} />
        </CardContent>
      </Card>

      <Roulette onSpinComplete={() => {
        // Delay de 1.5s garante que os dados já foram gravados no Firebase
        setTimeout(() => fetchHomeStats(user.id), 1500);
      }} />
    </div>
  );
}
