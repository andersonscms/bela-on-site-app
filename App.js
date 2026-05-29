import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image, ScrollView, Dimensions, TextInput, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { ChevronLeft, MapPin, Star, Clock, User, Lock, Calendar, CheckCircle } from 'lucide-react-native';

const API_URL = "https://bela-onsite-api.onrender.com";
const screenWidth = Dimensions.get('window').width;
const Stack = createNativeStackNavigator();

// --- TELA DE LOGIN ---
function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('ricardo@teste.com');
  const [senha, setSenha] = useState('123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const data = await response.json();
      if (data.token) {
        await SecureStore.setItemAsync('userToken', data.token);
        await SecureStore.setItemAsync('userId', data.usuario.id.toString());
        navigation.goBack();
      } else { Alert.alert("Erro", data.erro); }
    } catch (err) { Alert.alert("Erro", "Falha de conexão"); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { justifyContent: 'center', padding: 30 }]}>
      <Text style={styles.title}>Entrar</Text>
      <TextInput style={styles.inputArea} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.inputArea} placeholder="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
      <TouchableOpacity style={styles.bookBtn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.bookBtnText}>Entrar</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- TELA 1: HOME ---
function HomeScreen({ navigation }) {
  const [categorias, setCategorias] = useState([]);
  useEffect(() => { fetch(`${API_URL}/categorias`).then(res => res.json()).then(setCategorias); }, []);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.greeting}>Bela On Site ✨</Text><Text style={styles.title}>Categorias</Text></View>
      <FlatList data={categorias} numColumns={2} contentContainerStyle={styles.list} renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Servicos', { catId: item.id_categoria, catNome: item.nome_categoria })}>
          <Star color="#d81b60" size={32} /><Text style={styles.cardTitle}>{item.nome_categoria}</Text>
        </TouchableOpacity>
      )} keyExtractor={item => item.id_categoria.toString()} />
    </SafeAreaView>
  );
}

// --- TELA 2: SERVIÇOS ---
function ServicesScreen({ route, navigation }) {
  const { catId, catNome } = route.params;
  const [servicos, setServicos] = useState([]);
  useEffect(() => { fetch(`${API_URL}/servicos/${catId}`).then(res => res.json()).then(setServicos); }, []);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}><TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft color="#d81b60" size={30} /></TouchableOpacity>
      <Text style={styles.titleInner}>{catNome}</Text></View>
      <FlatList data={servicos} renderItem={({ item }) => (
        <TouchableOpacity style={styles.serviceItem} onPress={() => navigation.navigate('Perfil', { profId: 1, servico: item })}>
          <View><Text style={styles.serviceName}>{item.nome_servico}</Text></View><Text style={styles.servicePrice}>R$ {item.preco}</Text>
        </TouchableOpacity>
      )} />
    </SafeAreaView>
  );
}

// --- TELA 3: PERFIL ---
function ProfessionalProfile({ route, navigation }) {
  const { profId, servico } = route.params;
  const [perfil, setPerfil] = useState(null);
  const [fotos, setFotos] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/perfil-profissional/${profId}`).then(res => res.json()).then(setPerfil);
    fetch(`${API_URL}/profissionais/${profId}/galeria`).then(res => res.json()).then(setFotos);
  }, []);

  const handleBooking = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    if (!token) navigation.navigate('Login');
    else navigation.navigate('Agendamento', { profId, servico });
  };

  if (!perfil) return <ActivityIndicator style={{flex:1}} />;
  return (
    <ScrollView style={styles.container}>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1560756206-056ce5c03c62?w=500' }} style={{width:'100%', height:200}} />
        <View style={styles.infoBox}><Text style={styles.profName}>{perfil.nome}</Text><Text>{perfil.profissionais_detalhes?.bio}</Text></View>
        <Text style={styles.sectionTitle}>Portfólio</Text>
        <View style={styles.galleryGrid}>{fotos.map(f => <Image key={f.id_foto} source={{ uri: f.url_foto }} style={styles.galleryImg} />)}</View>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBooking}><Text style={styles.bookBtnText}>Agendar {servico.nome_servico}</Text></TouchableOpacity>
    </ScrollView>
  );
}

// --- TELA 4: ESCOLHA DE HORÁRIO ---
function BookingScreen({ route, navigation }) {
  const { profId, servico } = route.params;
  const [horarios, setHorarios] = useState([]);
  const [selecionado, setSelecionado] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/horarios/${profId}`).then(res => res.json()).then(setHorarios);
  }, []);

  const confirmarReserva = async () => {
    const token = await SecureStore.getItemAsync('userToken');
    const userId = await SecureStore.getItemAsync('userId');

    const response = await fetch(`${API_URL}/confirmar-agendamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        id_cliente: parseInt(userId),
        id_profissional: profId,
        id_servico: servico.id_servico,
        data_hora_inicio: `2026-05-23T${selecionado}:00Z` // Exemplo fixo para o teste
      })
    });

    if (response.ok) {
      Alert.alert("Sucesso! 🎉", "Seu agendamento foi confirmado. Aline te espera!", [{ text: "Ver Meus Pedidos", onPress: () => navigation.navigate('Home') }]);
    } else {
      const err = await response.json();
      Alert.alert("Erro", err.error || "Tente outro horário");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Escolha o Horário</Text></View>
      <View style={styles.list}>
        {['09:00', '10:00', '11:00', '14:00', '15:00'].map(h => (
          <TouchableOpacity key={h} style={[styles.hourCard, selecionado === h && {backgroundColor:'#d81b60'}]} onPress={() => setSelecionado(h)}>
            <Text style={{color: selecionado === h ? '#FFF' : '#333'}}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selecionado && <TouchableOpacity style={styles.bookBtn} onPress={confirmarReserva}><Text style={styles.bookBtnText}>Confirmar para {selecionado}</Text></TouchableOpacity>}
    </SafeAreaView>
  );
}

// --- NAVEGADOR ---
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Servicos" component={ServicesScreen} />
        <Stack.Screen name="Perfil" component={ProfessionalProfile} />
        <Stack.Screen name="Agendamento" component={BookingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
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
  list: { padding: 15, flexDirection: 'row', flexWrap: 'wrap' },
  card: { flex: 1, margin: 10, padding: 20, backgroundColor: '#fff5f8', borderRadius: 25, alignItems: 'center', elevation: 3 },
  cardTitle: { fontWeight: 'bold', marginTop: 10 },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  serviceName: { fontSize: 17, fontWeight: '600' },
  servicePrice: { fontSize: 17, fontWeight: 'bold', color: '#27ae60' },
  infoBox: { backgroundColor: '#FFF', margin: 20, borderRadius: 20, padding: 20, elevation: 5 },
  profName: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', margin: 20 },
  galleryImg: { width: (screenWidth - 50) / 2, height: 180, margin: 5, borderRadius: 15 },
  bookBtn: { backgroundColor: '#d81b60', margin: 20, padding: 18, borderRadius: 15, alignItems: 'center' },
  bookBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  inputArea: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 15 },
  hourCard: { padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 10, margin: 5, width: 80, alignItems: 'center' }
});