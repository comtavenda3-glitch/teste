import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import CheckIn from '../components/CheckIn';
import Roulette from '../components/Roulette';
import { TrendingUp, Users, Wallet, Loader2 } from 'lucide-react';

import { db } from "../firebase/firebase"; 
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ 
    todayEarnings: 0, 
    totalInvites: 0,
    allTimeEarnings: 0 // Nova stat para o ganho total
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchHomeStats(user.id);
    }
  }, [user?.id]);

  const fetchHomeStats = async (userId: string) => {
    try {
      setLoading(true);
      
      // 1. Total de Convidados (Equipe)
      const qTeam = query(collection(db, 'users'), where('referredBy', '==', userId));
      const teamSnap = await getDocs(qTeam);
      
      // 2. Configuração de Datas para "Hoje"
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = Timestamp.fromDate(today);

      // 3. Buscar TODAS as transações de ganho (sem filtro de data inicialmente)
      // Tipos: commission, roulette, investment, checkin
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const qAllTransactions = query(transactionsRef);
      const querySnapshot = await getDocs(qAllTransactions);

      let todayTotal = 0;
      let allTimeTotal = 0;
      
      const earningTypes = ['commission', 'roulette', 'investment', 'checkin'];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const amount = Number(data.amount || 0);
        const type = data.type;
        const createdAt = data.createdAt;

        // Se o tipo da transação for um tipo de ganho
        if (earningTypes.includes(type)) {
          // Soma no Total Geral
          allTimeTotal += amount;

          // Se for de hoje, soma no Hoje
          if (createdAt && createdAt.seconds >= startOfToday.seconds) {
            todayTotal += amount;
          }
        }
      });

      setStats({
        todayEarnings: todayTotal,
        totalInvites: teamSnap.size,
        allTimeEarnings: allTimeTotal
      });
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Stats Cards: Ganhos Hoje e Equipe */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#111111]/80 border-[#1a1a1a]">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#22c55e]" />
              <span className="text-gray-400 text-sm">Ganhos Hoje</span>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">
              R$ {stats.todayEarnings.toFixed(2)}
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
            R$ {Number(user.balance || 0).toFixed(2)}
          </p>
          <div className="pt-3 border-t border-[#1a1a1a] flex justify-between text-sm">
            <span className="text-gray-500">Total Ganhos (Geral)</span>
            <span className="text-[#22c55e] font-semibold">
              R$ {stats.allTimeEarnings.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Widgets */}
      <Card className="bg-[#111111]/80 border-[#1a1a1a]">
        <CardContent className="pt-6">
          <CheckIn onCheckInComplete={() => fetchHomeStats(user.id)} />
        </CardContent>
      </Card>

      <Roulette onSpinComplete={() => fetchHomeStats(user.id)} />
    </div>
  );
}
