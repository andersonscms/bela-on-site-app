import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, ScrollView, Dimensions, TextInput, Alert, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { ChevronLeft, Star, Clock, User, Lock, MapPin, CheckCircle, Calendar, Phone, LogOut } from 'lucide-react-native';

const API_URL = "https://bela-onsite-api.onrender.com";
const screenWidth = Dimensions.get('window').width;
const Stack = createNativeStackNavigator();

// --- TELA DE LOGIN (COM LOGICA DE PERFIL) ---
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) return Alert.alert("Erro", "Preencha os campos");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha })
      });
      const data = await response.json();

      if (data.token) {
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userId', data.usuario.id.toString());
        await SecureStore.setItemAsync('userRole', data.usuario.tipo); // 'CLIENTE' ou 'PROFISSIONAL'

        if (data.usuario.tipo === 'PROFISSIONAL') {
          navigation.replace('AgendaProfissional');
        } else {
          navigation.replace('Home');
        }
      } else { Alert.alert("Erro", "Credenciais incorretas"); }
    } catch (err) { Alert.alert("Erro", "Servidor fora do ar"); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { justifyContent: 'center', padding: 30 }]}>
      <Text style={[styles.title, {textAlign:'center', marginBottom: 30}]}>Bela On Site ✨</Text>
      <TextInput style={styles.inputArea} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.inputArea} placeholder="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
      <TouchableOpacity style={styles.bookBtn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.bookBtnText}>Entrar</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- TELA 1: HOME DO CLIENTE ---
function HomeScreen({ navigation }) {
  const [categorias, setCategorias] = useState([]);
  useEffect(() => { fetch(`${API_URL}/categorias`).then(res => res.json()).then(setCategorias); }, []);

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <Text style={styles.greeting}>Bem-vinda! ✨</Text>
          <View style={{flexDirection:'row', gap: 15}}>
            <TouchableOpacity onPress={() => navigation.navigate('MeusAgendamentos')}><Calendar color="#d81b60" size={24} /></TouchableOpacity>
            <TouchableOpacity onPress={logout}><LogOut color="#888" size={24} /></TouchableOpacity>
          </View>
        </View>
        <Text style={styles.title}>Categorias</Text>
      </View>
      <FlatList data={categorias} numColumns={2} contentContainerStyle={styles.list} renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Servicos', { catId: item.id_categoria, catNome: item.nome_categoria })}>
          <Star color="#d81b60" size={32} /><Text style={styles.cardTitle}>{item.nome_categoria}</Text>
        </TouchableOpacity>
      )} keyExtractor={item => item.id_categoria.toString()} />
    </SafeAreaView>
  );
}

// --- TELA ESPECIAL: AGENDA DA PROFISSIONAL ---
function ProfessionalAgenda({ navigation }) {
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarAgenda = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    fetch(`${API_URL}/agenda/hoje`, { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { setAgendas(data); setLoading(false); });
  };

  useEffect(() => { carregarAgenda(); }, []);

  const atualizarStatus = async (id, status) => {
    const token = await SecureStore.getItemAsync('userToken');
    await fetch(`${API_URL}/atualizar-status/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ novo_status: status })
    });
    carregarAgenda();
    Alert.alert("Sucesso", "Status atualizado!");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, Aline! 💅</Text>
        <Text style={styles.title}>Sua Agenda de Hoje</Text>
      </View>
      {loading ? <ActivityIndicator color="#d81b60" /> : (
        <FlatList data={agendas} contentContainerStyle={{padding: 20}} renderItem={({ item }) => (
          <View style={styles.appointmentCard}>
            <Text style={{fontWeight:'bold', fontSize: 18}}>{item.servicos.nome_servico}</Text>
            <View style={styles.row}><Clock size={16} color="#666"/><Text> {new Date(item.data_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></View>
            <View style={styles.row}><User size={16} color="#666"/><Text> {item.usuarios.nome}</Text></View>
            <View style={styles.row}><MapPin size={16} color="#d81b60"/><Text style={{color:'#d81b60', fontWeight:'bold'}}> {item.endereco_atendimento}</Text></View>
            
            <View style={{flexDirection:'row', gap: 10, marginTop: 15}}>
              <TouchableOpacity onPress={() => atualizarStatus(item.id_combina, 'CONCLUIDO')} style={[styles.miniBtn, {backgroundColor:'#27ae60'}]}><Text style={{color:'#FFF'}}>Concluir</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => atualizarStatus(item.id_combina, 'CANCELADO')} style={[styles.miniBtn, {backgroundColor:'#888'}]}><Text style={{color:'#FFF'}}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        )} 
        ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 50, color:'#999'}}>Nenhum serviço para hoje!</Text>}
        />
      )}
      <TouchableOpacity onPress={async () => { await SecureStore.deleteItemAsync('userToken'); navigation.replace('Login'); }} style={{padding: 20}}><Text style={{color:'#888', textAlign:'center'}}>Sair da Conta</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

// --- TELA DE SERVIÇOS, PERFIL E MEUS AGENDAMENTOS (Igual antes) ---
function ServicesScreen({ route, navigation }) {
  const { catId, catNome } = route.params;
  const [servicos, setServicos] = useState([]);
  useEffect(() => { fetch(`${API_URL}/servicos/${catId}`).then(res => res.json()).then(setServicos); }, []);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}><TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="#d81b60" size={30} /></TouchableOpacity><Text style={styles.titleInner}>{catNome}</Text></View>
      <FlatList data={servicos} renderItem={({ item }) => (
        <TouchableOpacity style={styles.serviceItem} onPress={() => navigation.navigate('Perfil', { profId: 1, servico: item })}>
          <View><Text style={styles.serviceName}>{item.nome_servico}</Text></View><Text style={styles.servicePrice}>R$ {item.preco}</Text>
        </TouchableOpacity>
      )} />
    </SafeAreaView>
  );
}

function ProfessionalProfile({ route, navigation }) {
  const { profId, servico } = route.params;
  const [perfil, setPerfil] = useState(null);
  useEffect(() => { fetch(`${API_URL}/perfil-profissional/${profId}`).then(res => res.json()).then(setPerfil); }, []);
  if (!perfil) return <ActivityIndicator style={{flex:1}} />;
  return (
    <ScrollView style={styles.container}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1560756206-056ce5c03c62?w=500' }} style={{width:'100%', height:200}} />
        <View style={styles.infoBox}><Text style={styles.profName}>{perfil.nome}</Text><Text>{perfil.profissionais_detalhes?.bio}</Text></View>
        <TouchableOpacity style={styles.bookBtn} onPress={async () => (await SecureStore.getItemAsync('userToken')) ? navigation.navigate('Agendamento', { profId, servico }) : navigation.navigate('Login')}><Text style={styles.bookBtnText}>Agendar {servico.nome_servico}</Text></TouchableOpacity>
    </ScrollView>
  );
}

function BookingScreen({ route, navigation }) {
  const { profId, servico } = route.params;
  const [endereco, setEndereco] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const confirmar = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    const userId = await SecureStore.getItemAsync('userId');
    await fetch(`${API_URL}/confirmar-agendamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ id_cliente: parseInt(userId), id_profissional: profId, id_servico: servico.id_servico, data_hora_inicio: `2026-05-23T${selecionado}:00Z`, endereco_atendimento: endereco })
    });
    Alert.alert("Sucesso!", "Agendado!", [{ text: "OK", onPress: () => navigation.navigate('Home') }]);
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{padding: 20}}>
        <Text style={styles.label}>Endereço:</Text>
        <TextInput style={styles.inputArea} value={endereco} onChangeText={setEndereco} placeholder="Onde você está?" />
        <Text style={styles.label}>Horário:</Text>
        <View style={{flexDirection:'row', flexWrap:'wrap'}}>{['09:00', '10:00', '14:00', '15:00'].map(h => <TouchableOpacity key={h} onPress={() => setSelecionado(h)} style={[styles.hourCard, selecionado === h && {backgroundColor:'#d81b60'}]}><Text style={{color: selecionado === h ? '#FFF' : '#000'}}>{h}</Text></TouchableOpacity>)}</View>
        {selecionado && <TouchableOpacity style={styles.bookBtn} onPress={confirmar}><Text style={styles.bookBtnText}>Confirmar</Text></TouchableOpacity>}
      </ScrollView>
    </SafeAreaView>
  );
}

function MyAppointments({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  useEffect(() => {
    const load = async () => {
      const id = await SecureStore.getItemAsync('userId');
      const token = await SecureStore.getItemAsync('userToken');
      fetch(`${API_URL}/meus-agendamentos/${id}`, { headers: { 'Authorization': `Bearer ${token}` }}).then(res => res.json()).then(setPedidos);
    };
    load();
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <FlatList data={pedidos} renderItem={({ item }) => (
        <View style={styles.appointmentCard}><Text style={styles.serviceName}>{item.servicos.nome_servico}</Text><Text>{item.status_agendamento}</Text></View>
      )} />
    </SafeAreaView>
  );
}

// --- NAVEGADOR ---
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AgendaProfissional" component={ProfessionalAgenda} />
        <Stack.Screen name="Servicos" component={ServicesScreen} />
        <Stack.Screen name="Perfil" component={ProfessionalProfile} />
        <Stack.Screen name="Agendamento" component={BookingScreen} />
        <Stack.Screen name="MeusAgendamentos" component={MyAppointments} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 25, paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50 },
  greeting: { fontSize: 16, color: '#d81b60', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  titleInner: { fontSize: 22, fontWeight: 'bold', marginLeft: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 },
  list: { padding: 10 },
  label: { fontWeight: 'bold', marginBottom: 5 },
  card: { flex: 1, margin: 10, padding: 20, backgroundColor: '#fff5f8', borderRadius: 25, alignItems: 'center', elevation: 3 },
  cardTitle: { fontWeight: 'bold', marginTop: 10 },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  serviceName: { fontSize: 17, fontWeight: '600' },
  servicePrice: { fontSize: 17, fontWeight: 'bold', color: '#27ae60' },
  infoBox: { backgroundColor: '#FFF', margin: 20, borderRadius: 20, padding: 20, elevation: 5 },
  profName: { fontSize: 22, fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#d81b60', margin: 20, padding: 18, borderRadius: 15, alignItems: 'center' },
  bookBtnText: { color: '#FFF', fontWeight: 'bold' },
  inputArea: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 15 },
  hourCard: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 10, margin: 5 },
  appointmentCard: { margin: 15, padding: 20, backgroundColor: '#fdfdfd', borderRadius: 15, borderWidth: 1, borderColor: '#eee', elevation: 2 },
  miniBtn: { padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' }
});