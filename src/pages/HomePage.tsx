import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import CheckIn from '../components/CheckIn';
import Roulette from '../components/Roulette';
import { TrendingUp, Users, Wallet } from 'lucide-react';

import { db } from "../firebase/firebase"; 
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ todayEarnings: 0, totalInvites: 0 });
  const [loading, setLoading] = useState(true);

  // Busca os dados assim que o ID do usuário estiver disponível
  useEffect(() => {
    if (user?.id) {
      fetchStats(user.id);
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchStats = async (userId: string) => {
    try {
      setLoading(true);

      // 1. Buscar Total de Convidados (Nível 1)
      const qTeam = query(collection(db, 'users'), where('referredBy', '==', userId));
      const teamSnap = await getDocs(qTeam);
      const teamCount = teamSnap.size;

      // 2. Buscar Ganhos de Hoje (Comissões recebidas a partir das 00:00 de hoje)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = Timestamp.fromDate(today);

      const qEarnings = query(
        collection(db, 'users', userId, 'transactions'),
        where('type', '==', 'commission'),
        where('createdAt', '>=', startOfToday)
      );

      const earningsSnap = await getDocs(qEarnings);
      let todayTotal = 0;
      earningsSnap.forEach(doc => {
        todayTotal += Number(doc.data().amount || 0);
      });

      setStats({
        todayEarnings: todayTotal,
        totalInvites: teamCount
      });

    } catch (err) {
      console.error('Erro ao buscar estatísticas da Home:', err);
      setStats({ todayEarnings: 0, totalInvites: 0 });
    } finally {
      setLoading(false);
    }
  };

  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || 'M';
  };

  return (
    <div className="space-y-6 pb-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div>
          <p className="text-gray-400 text-sm">Bem-vindo de volta</p>
          <h1 className="text-xl font-bold text-white">
            {user?.email?.split('@')[0] || 'Usuário'}
          </h1>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-[#22c55e] to-[#16a34a] rounded-full flex items-center justify-center shadow-lg shadow-[#22c55e]/30">
          <span className="text-xl font-bold text-white">{getUserInitial()}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a] animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#22c55e]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[#22c55e]" />
              </div>
              <span className="text-gray-400 text-sm">Ganhos Hoje</span>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">
              R$ {stats.todayEarnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a] animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-[#22c55e]/20 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-[#22c55e]" />
              </div>
              <span className="text-gray-400 text-sm">Convidados</span>
            </div>
            <p className="text-2xl font-bold text-[#22c55e]">{stats.totalInvites}</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Card */}
      <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#22c55e]/30 animate-fade-in">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-[#22c55e]" />
            <span className="text-gray-400 text-sm">Saldo Disponível</span>
          </div>
          <p className="text-3xl font-extrabold text-white mb-3">
            R$ {(Number(user?.balance) || 0).toFixed(2)}
          </p>
          <div className="pt-3 border-t border-[#1a1a1a]">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Ganhos</span>
              <span className="text-[#22c55e] font-semibold">
                {/* Alterado de totalEarned para totalCommissions */}
                R$ {(Number(user?.totalCommissions) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Check-in */}
      <Card className="bg-[#111111]/80 backdrop-blur-sm border-[#1a1a1a] animate-fade-in">
        <CardContent className="pt-6">
          <h3 className="text-white font-bold mb-4">Login Diário</h3>
          <CheckIn onCheckInComplete={() => user?.id && fetchStats(user.id)} />
        </CardContent>
      </Card>

      {/* Roulette */}
      <div className="animate-fade-in">
        <Roulette onSpinComplete={() => user?.id && fetchStats(user.id)} />
      </div>
    </div>
  );
}
