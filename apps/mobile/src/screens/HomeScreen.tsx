import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { apiClient } from '../api/client';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // NestJS থেকে ডাটা ফেচ করার ফাংশন
    const fetchBackendStatus = async () => {
      try {
        // আপনার NestJS এর যেকোনো একটি পাবলিক এন্ডপয়েন্ট দিন (যেমন: '/users' বা '/')
        const response = await apiClient.get('/admin/auth/me'); // অথবা আপনার ইচ্ছামতো এন্ডপয়েন্ট
        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'API Connection Failed');
      } finally {
        setLoading(false);
      }
    };

    fetchBackendStatus();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      
      <View style={styles.apiCard}>
        <Text style={styles.cardTitle}>Backend Status:</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#4f46e5" />
        ) : error ? (
          <Text style={styles.errorText}>❌ Error: {error}</Text>
        ) : (
          <Text style={styles.successText}>✅ Connected to NestJS!</Text>
        )}
      </View>

      <Button 
        title="Go to Login" 
        onPress={() => navigation.navigate('Login')} 
        color="#4f46e5"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 24,
  },
  apiCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  errorText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  successText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
});