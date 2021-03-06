/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  SafeAreaView,
  Image,
  TouchableOpacity,
  View,
  Picker,
  AsyncStorage,
} from 'react-native';
import {Flex, Button} from '@ant-design/react-native';
import {secondaryFont, primaryFont} from '../../../utils/globalStyles/fonts';
import {mainBlue} from '../../../utils/globalStyles/colors';
import {getUserData, distance, getCurrentCoordinates, replaceObject} from '../../../utils/helpers';
import * as Progress from 'react-native-progress';
import Spinner from 'react-native-loading-spinner-overlay';
import Collapsible from 'react-native-collapsible';
import api from '../../../utils/api';
import Geolocation from '@react-native-community/geolocation';
import { request, PERMISSIONS } from 'react-native-permissions';

const calculateSocialConfinement = (locations, defaultLocation, defaultConfinementDistance) => {
  console.log({locations, defaultConfinementDistance})
  const {latitude: initialLatitude, longitude: initialLongitude} = defaultLocation || locations?.[0] || {latitude: 0, longitude: 0};
  let count = locations?.length;
  
  if (locations?.length === 0) {
    return 100;
  }
  else {
    for(let i = 1; i< locations?.length; i++) {
      const lat = locations[i].latitude;
      const lon = locations[i].longitude;
      const distanceBetween = distance(initialLatitude, initialLongitude, lat, lon, 'M');
      
      if (distanceBetween > defaultConfinementDistance){
        count -= 1;
      }
    }
    return count/locations?.length * 100;
  }
}

const Analytics: (navigation) => Promise<React$Node> = ({navigation}) => {
  const [userData, setUserData] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [defaultConfinementDistance, setDefaultConfinementDistance] = useState(50)

  useEffect(() => {
    getUserData().then((data) => {
      setUserData(data);
      console.log({data})
      setDefaultConfinementDistance(data.user.defaultConfinementDistance)
      })
  }, []);

  console.log({userData, defaultConfinementDistance})

  const setCurrentPosition = () => {
    Geolocation.setRNConfiguration({
      skipPermissionRequests: false,
      authorizationLevel: 'always',
    });
    
    Geolocation.getCurrentPosition(
      async info => {
        const data = await AsyncStorage.getItem('userData');
        const userData = JSON.parse(data);
        console.log({info});
        
        const res = await api.put(`/users/updateDefaultLocation/${userData.user.id}`, {
          defaultLocation: {
            latitude: info.coords.latitude.toString(),
            longitude: info.coords.longitude.toString(),
            createdAt: new Date(),
          },
        });
        console.log({res})
      },
      err =>
        request(PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION).then(result => {
          if (result === 'granted') {
            Geolocation.getCurrentPosition(
              info => console.log({info}),
              err => console.log({err}),
            );
          }
        }),
    );
  }

  const setConfinementDistance = async (distance) => {
    const data = await AsyncStorage.getItem('userData');
    const userData = JSON.parse(data);
    
    api.put(`/users/updateDefaultConfinementDistance/${userData.user.id}`, {
      defaultConfinementDistance: distance,
    })
    .then((res) => res.json())
    .then(async (resJson) => {
      console.log({resJson});
      
      const newUserDataJson = await replaceObject(
        await getUserData(),
        'user',
        resJson,
      );
      console.log({newUserDataJson});
      if (newUserDataJson.token) {
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify(newUserDataJson),
        );
        setDefaultConfinementDistance(newUserDataJson.user.defaultConfinementDistance)
      }
    })
  }

  if(Object.keys(userData).length === 0) {
    return (
      <Spinner visible />
    )
  }
  return (
    <ScrollView>
      <SafeAreaView style={styles.container}>
        <Flex justify="between">
          <Image source={require('../../../assets/img/trackoronaWhite.png')} 
          style={{
            width: 136,
            height: 14,
            resizeMode: 'stretch',
          }}/>
          <TouchableOpacity onPress={() => navigation.navigate('Home', { refresh: () => console.log('kkkkkkkkkkkkkkkkkkkk')})}>
            <Text
              style={{
                color: 'white',
                fontSize: 24,
                fontFamily: primaryFont,
                borderBottomWidth: 1,
                borderBottomColor: 'white',
              }}>
              القائمة
            </Text>
          </TouchableOpacity>
        </Flex>
        <Text style={{...styles.headline, color: 'white', marginTop: 45}}>
          تحركاتك
        </Text>
        <Text style={{...styles.subHeadline, color: 'white', marginBottom: 45}}>
          هنا تجد كل تحركاتك ومدى التزامك بالعزل الاجتماعي
        </Text>
        
        <TouchableOpacity onPress={() => setIsCollapsed(!isCollapsed)}>
          <Text style={{fontFamily: secondaryFont, fontSize: 16, color: 'white', marginBottom: 20}}>
            إضغط هنا لتعديل إعدادات العزل الاجتماعي
          </Text>
        </TouchableOpacity>
        <Collapsible collapsed={isCollapsed}>
          <View style={{borderRadius: 25, backgroundColor: 'white', padding: 20, marginBottom: 20}}>
            <Button type='primary' onPress={setCurrentPosition}>
              <Text style={{fontFamily: secondaryFont}}>
                تعيين هذا المكان كإحداثيات منزلك
              </Text>
            </Button>
            <Flex justify='between'>
              <Picker
              style={{flex: 1}}
                mode="dropdown"
                selectedValue={defaultConfinementDistance}
                onValueChange={(itemValue, itemIndex) =>
                  setConfinementDistance(itemValue)
                }>
                <Picker.Item label="50 مترا" value={50} />
                <Picker.Item label="80 مترا" value={80} />
                <Picker.Item label="100 متر" value={100} />
                <Picker.Item label="130 متر" value={130} />
              </Picker>
              <Text style={{fontFamily: secondaryFont}}>
              حدد محيط العزل الاجتماعي
              </Text>
            </Flex>
          </View>
        </Collapsible>

        <Flex justify="between">
          <View style={styles.bigCard}>
            <Text style={{...styles.cardText, marginBottom: 20}}>
              احتمال إصابتك بالفايروس
            </Text>
            <View
              style={{
                width: 45,
                height: '80%',
                borderRadius: 10,
                backgroundColor: '#FFE9E2',
                display: 'flex',
                justifyContent: 'flex-end',
                marginRight: 'auto',
                marginLeft: 'auto',
              }}>
              <View
                style={{
                  width: 45,
                  height: `${userData && userData.user.illnessScore ? userData?.user?.illnessScore : 0}%`,
                  borderRadius: 10,
                  backgroundColor: '#FF6E3F',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    paddingVertical: 15,
                    fontSize: 18,
                    fontFamily: secondaryFont,
                    color: 'white',
                  }}>
                  {userData && userData.user.illnessScore ? userData?.user?.illnessScore : 0}%
                </Text>
              </View>
            </View>
            {userData?.user?.illnessScore === 0 &&
              <View style={styles.overlay}>
              <Text
                style={{
                  textAlign: 'center',
                  paddingTop: '50%',
                  fontSize: 18,
                  fontFamily: secondaryFont,
                  color: 'white',
                  lineHeight: 26,
                }}>
                  أنت لم تقم بعد بإجراء الفحص الافتراضي، المرجو إجراء الفحص للحصول على نتيجة أدق
                </Text>
                <Button 
                    style={{
                      width: '80%',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }} type="primary" onPress={() => navigation.navigate('Test')}>
                  <Text
                    style={{
                      fontFamily: secondaryFont,
                      fontSize: 15
                    }}>
                    إجراء الفحص
                  </Text>
                </Button>
            </View>}
          </View>
          <View>
            <View style={{...styles.smallCard, marginBottom: 20}}>
              <Text style={styles.cardText}>
                عدد الأشخاص الذين الذين احتككت بهم
              </Text>
              <Text style={styles.cardNumber}>{userData && userData.user.contactedPeople ? userData.user.contactedPeople.length : 0}</Text>
            </View>
            <View style={{...styles.smallCard, height: 190}}>
              <Text style={styles.cardText}>نسبة التزامك بالعزل الاجتماعي</Text>
              <View
                style={{
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginTop: 20,
                }}>
                <Progress.Circle
                  progress={userData && calculateSocialConfinement(userData.user.locations, userData.user.defaultLocation, defaultConfinementDistance)/100}
                  color="#FF6E3F"
                  unfilledColor="#FFE9E2"
                  size={75}
                  showsText
                  thickness={7}
                  borderWidth={0}
                  textStyle={{fontSize: 14, fontWeight: 'bold'}}
                />
              </View>
            </View>
          </View>
        </Flex>
        <View
          style={{
            ...styles.bigCard,
            width: '100%',
            height: 'auto',
            marginTop: 30,
          }}>
          <Text style={{...styles.headline, fontSize: 22}}>
            هذه بعض النصائح للاتباع
          </Text>
          <Text style={styles.cardText}>
            *كلما كان عدد الأشخاص الذين احتككت بهم صغيرا كلما قل احتمال إصابتك
          </Text>
          <Text style={styles.cardText}>
            *كلما كانت نسبة الالتزام بالعزل الاجتماعي كبيرة كلما قل احتمال
            إصابتك
          </Text>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default Analytics;

const styles = StyleSheet.create({
  container: {
    paddingTop: '7%',
    paddingBottom: 45,
    paddingHorizontal: '9%',
    direction: 'rtl',
    flex: 1,
    backgroundColor: mainBlue,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  cardText: {
    fontSize: 14,
    textAlign: 'right',
    fontFamily: secondaryFont,
    lineHeight: 20,
  },
  cardNumber: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 30,
    color: '#FF6E3F',
    backgroundColor: '#FFE9E2',
    borderRadius: 15,
    marginTop: 15,
  },
  cardNumberConfinement: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 30,
    color: '#FF6E3F',
    backgroundColor: '#FFE9E2',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 10,
    borderColor: '#ff6e3f',
    marginTop: 15,
  },
  probability: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 80,
    color: 'red',
  },
  headline: {
    fontFamily: primaryFont,
    fontSize: 31,
    textAlign: 'right',
  },
  subHeadline: {
    fontFamily: secondaryFont,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 30,
  },
  bigCard: {
    height: 360,
    width: 150,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 20,
  },
  smallCard: {
    height: 150,
    width: 150,
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 20,
  },
  overlay:{
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    
  }
});
