import { Router } from 'express';
import { authorizationMiddleware } from '../middlewares.js';
import { ADDRESSES, ORDERS } from '../db.js';

export const OrdersRouter = Router();



const convertToDate = (date) => {

 /***
  * ^ -- початок рядка
  * \d -- перевірка на цифру
  * {N} -- N - разів повторень
  */
 // if (/^\d\d-(01|02|03|....|10|11|12)-\d{4}$/.test(query.createdAt)) { }
 if (!/^\d\d-\d\d-\d{4}$/.test(date)) {
  // return res.status(400).send({ message: `parameter createdAt has wrong format` });
  throw new Error(`parameter createdAt has wrong format`);
 }

 // const res = query.createdAt.split('-');
 // const month = res[1];
 const [day, month, year] = date.split('-');

 const mothsInt = parseInt(month);
 if (mothsInt < 1 || mothsInt > 12) {
  // return res.status(400).send({ message: `parameter createdAt has wrong month value` });

  throw new Error(`parameter createdAt has wrong month value`);
 }

 const result = new Date();
 result.setHours(2);
 result.setMinutes(0);
 result.setMilliseconds(0);
 result.setSeconds(0);

 result.setMonth(mothsInt - 1);
 result.setDate(day);
 result.setFullYear(year);

 return result;
};

const convertToDateMiddleware = (fieldName) => (req, res, next) => {
 const valueString = req.query[fieldName];

 if (!valueString) {
  return next();
 }
 try {
  const value = convertToDate(valueString);
  req.query[fieldName] = value;
  return next();
 } catch (err) {
  return res.status(400)
   .send({ message: err.toString() });
 }
};

OrdersRouter.post('/orders', authorizationMiddleware, (req, res) => {
 const { body, user } = req;
 let price = 0

 const createdAt = new Date();
 createdAt.setHours(2);
 createdAt.setMinutes(0);
 createdAt.setMilliseconds(0);
 createdAt.setSeconds(0);

 const findFromPointInDB = ADDRESSES.find(({name}) => name === body.from);
 const findToPointInDB = ADDRESSES.find(({name}) => name === body.to)
 if (!findFromPointInDB || !findToPointInDB) {
  return res.status(400).send({ message: 'This address dont exist' });
 }
 
 function formula(longitude_from, latitude_from, longitude_to, latitude_to) {
  const earthRadius = 6371; 

  const latFromRadians = latitude_from * (Math.PI / 180);
  const latToRadians = latitude_to * (Math.PI / 180);
  const lonFromRadians = longitude_from * (Math.PI / 180);
  const lonToRadians = longitude_to * (Math.PI / 180);

  const latDiff = latToRadians - latFromRadians;
  const lonDiff = lonToRadians - lonFromRadians;

  const a = Math.sin(latDiff / 2) * Math.sin(latDiff / 2) + Math.cos(latFromRadians) * Math.cos(latToRadians) * Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c; 

  return distance;
}


 const distanceInKm = formula(findFromPointInDB.location.longitude, findFromPointInDB.location.latitude , findToPointInDB.location.longitude , findToPointInDB.location.latitude)
 const fixedDistanceInKm = distanceInKm.toFixed()

 switch (body.type){
  case "standart":
    price = fixedDistanceInKm * 2,5
  break

  case "lite":
    price = fixedDistanceInKm * 1,5
  break

  case "universal":
    price = fixedDistanceInKm * 3
  break

  default:
    res.status(400).send({ message: 'Incorrect type'});
  break

 }

 const order = {
  ...body,
  login: user.login,
  createdAt,
  status: "Active",
  id: crypto.randomUUID(),
  distance: fixedDistanceInKm + " km",
  price: price
 };

 ORDERS.push(order);

 return res.status(200).send({ message: 'Order was created', order });
});

/**
* GET /orders?createdAt=05-05-2024
* GET /orders?createdAt= g mhdfbg kjdfbgkjd
*/
OrdersRouter.get('/orders', authorizationMiddleware,
 convertToDateMiddleware('createdAt'),
 convertToDateMiddleware('createdFrom'),
 convertToDateMiddleware('createdTo'),
 (req, res) => {
  const { user, query, body, headers} = req;
  console.log(user)
  let orders = ORDERS.filter(el => el.login === user.login);
  const ordersActive = ORDERS.filter(el => el.status === 'Active');
  

  if (query.createdAt && query.createdFrom && query.createdTo) {
   return res.status(400).send({ message: "Too many parameter in query string" });
  }

  console.log(`query`, JSON.stringify(query));



  if (query.createdAt) {

   try {
    orders = ORDERS.filter(el => {
     const value = new Date(el.createdAt);
     return value.getTime() === query.createdAt.getTime();
    });
   } catch (err) {
    return res.status(400)
     .send({ message: err.toString() });
   }
  }

  if (query.createdFrom) {
   try {
    orders = ORDERS.filter(el => {
     const value = new Date(el.createdAt);
     return value.getTime() >= query.createdFrom.getTime();
    });
   } catch (err) {
    return res.status(400)
     .send({ message: err.toString() });
   }
  }

  if (query.createdTo) {
   try {
    orders = ORDERS.filter(el => {
     const value = new Date(el.createdAt);
     return value.getTime() <= query.createdTo.getTime();
    });
   } catch (err) {
    return res.status(400)
     .send({ message: err.toString() });
   }
  }


  switch(user.role) {
    case 'Customer':
      return res.status(200).send(orders)
    case 'Driver':
      return res.status(200).send(ordersActive)
    case 'Admin':
      return res.status(200).send(ORDERS)
    default:
      return res.status(400).send({ message: "Unauthorized" });

  }

  return res.status(200).send(orders);
 });



/**
 * PATCH /orders/fhsdjkhfkdsj
 * PATCH /orders/fhsdjkhfkdsj12
 * PATCH /orders/fhsdjkhfkdsj123
 * PATCH /orders/fhsdjkhfkd123sj
 */

OrdersRouter.patch('/orders/:orderId', (req, res) => {

 const { params , body } = req;

 const orderIndex = ORDERS.findIndex(el => el.id === params.orderId);

 if (orderIndex === -1) {
  return res.status(400).send({ message: `Order with id ${params.orderId} was not found` });
 }
 

 switch (user.role) {
  case 'Customer':
   if (ORDERS[orderIndex].status !== 'Active' || body.status !== 'Rejected') {
    return res.status(403).send({ message: "You are not allowed to change the status of this order" });
   }
   break;
  case 'Driver':
   if (!((ORDERS[orderIndex].status === 'Active' && body.status === 'In progress') ||
        (ORDERS[orderIndex].status === 'In progress' && body.status === 'Done'))) {
    return res.status(403).send({ message: "You are not allowed to change the status of this order" });
   }
   break;
  case 'Admin':
   if (!((ORDERS[orderIndex].status === 'Active' && body.status === 'Rejected') ||
        (ORDERS[orderIndex].status === 'Active' && body.status === 'In progress') ||
        (ORDERS[orderIndex].status === 'In progress' && body.status === 'Done'))) {
    return res.status(403).send({ message: "You are not allowed to change the status of this order" });
   }
   break;
  default:
   return res.status(403).send({ message: "Unauthorized" });
 }

 if (ORDERS[orderIndex].status === 'Done') {
  return res.status(403).send({ message: "You are not allowed to change the status of this order" });
 }




 ORDERS[orderIndex].status = body.status;
 return res.status(200).send(ORDERS[orderIndex]);
});