// modules
const crypto = require('crypto');
const moment = require('moment');
const _ = require('lodash');
const request = require('request');
const cheerio = require('cheerio');

// read MWS API's authentication info from external file
const AMAZON_CREDENTIAL = require('./amzn-credential');

// or you can write your credentials directly here (not suggested)
// {
//     'SELLER_ID': 'SELLER_ID',
//     'ACCESS_KEY_ID': 'ACCESS_KEY_ID',
//     'SECRET_KEY': 'SECRET_KEY',
//     'MARKETPLACE_ID': 'MARKETPLACE_ID',
// };

// MWS API endpoint
const ENDPOINT = 'mws.amazonservices.jp';

module.exports = {
    getStorageFee,
    getFees,
};


function get_timestamp(){
    return moment().utc().format('YYYY-MM-DDTHH:mm:ss\\Z');
}

function getQueryRequestStr(params) {
    const data = params;
    const ordered_keys = _.sortBy(Object.keys(data)).map((x) => encodeURIComponent(x));
    const ordered_values = ordered_keys.map((k) => data[k]).map((x) => encodeURIComponent(x));
    const query = _.zipWith(ordered_keys, ordered_values,(k,v) => `${k}=${v}`).join('&');

    return query;
}


function getSignature(query, section_name){
    const encoding_str = `POST\n${ENDPOINT}\n${section_name}\n${query}`;
    const hmac = crypto.createHmac('sha256', AMAZON_CREDENTIAL.SECRET_KEY)
    .update(encoding_str)
    .digest('base64');

    const signature = encodeURIComponent(hmac);

    return signature;
}


function sendRequest(query, signature, section_name){
    return new Promise((resolve,reject) => {
        try{
            const headers = {
                'Content-Type':'My Desktop Seller Tool/1.0 (Language=nodev7.8.0; Platform=Macintosh)'
            };

            const options = {
                url: `https://${ENDPOINT}${section_name}?${query}&Signature=${signature}`,
                method: 'POST',
                headers
            };

            request(options, (error, response, body) => {
                if(error){
                    return reject(error);
                }
                resolve(body);
            });
        }catch(err){
            console.log(err);
            reject(err);
        }
    }).catch((err) => {
        console.error(err);
        console.error('error at sendRequest function.');
    });
}


function getFees(asin, price, height, length, width){
    return new Promise((resolve,reject) => {
        const params = {
            IdType: 'ASIN',
            IdValue: asin,
            IsAmazonFulfilled: 'true',
            ListingPrice: {
                Amount: price,
                CurrencyCode: 'JPY',
            },
            Shipping: {
                Amount: '0',
                CurrencyCode: 'JPY',
            },
            Points: {
                PointsNumber: '0',
                PointsMonetaryValue: {
                    Amount: '0',
                    CurrencyCode: 'JPY',
                },
            },
        };


        getMyFeesEstimate(params)
        .then((res) => {
            const fee = Number(res.total_fee);
            resolve(fee);
        });
    });
}


function getMyFeesEstimate(params){
    return new Promise((resolve,reject) => {
        const timestamp = get_timestamp();
        const identifier = moment().format('x');
        const conf = {
            'Action': 'GetMyFeesEstimate',
            'AWSAccessKeyId': AMAZON_CREDENTIAL['ACCESS_KEY_ID'],
            'FeesEstimateRequestList.FeesEstimateRequest.1.Identifier': identifier,
            'FeesEstimateRequestList.FeesEstimateRequest.1.MarketplaceId': AMAZON_CREDENTIAL.MARKETPLACE_ID,
            'SellerId': AMAZON_CREDENTIAL['SELLER_ID'],
            'SignatureMethod': 'HmacSHA256',
            'SignatureVersion': '2',
            'Timestamp': timestamp,
            'Version': '2011-10-01',
        };

        const format_params = {
            'FeesEstimateRequestList.FeesEstimateRequest.1.IdType': params.IdType,
            'FeesEstimateRequestList.FeesEstimateRequest.1.IdValue': params.IdValue,
            'FeesEstimateRequestList.FeesEstimateRequest.1.IsAmazonFulfilled': params.IsAmazonFulfilled,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.ListingPrice.Amount': params.ListingPrice.Amount,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.ListingPrice.CurrencyCode': params.ListingPrice.CurrencyCode,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.Shipping.Amount': params.Shipping.Amount,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.Shipping.CurrencyCode': params.Shipping.CurrencyCode,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.Points.PointsNumber': params.Points.PointsNumber,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.Points.PointsMonetaryValue.Amount': params.Points.PointsMonetaryValue.Amount,
            'FeesEstimateRequestList.FeesEstimateRequest.1.PriceToEstimateFees.Points.PointsMonetaryValue.CurrencyCode': params.Points.PointsMonetaryValue.CurrencyCode,
        };

        const section_name = '/Products/2011-10-01';

        const data = _.merge(conf, format_params);
        const query = getQueryRequestStr(data);
        const signature = getSignature(query, section_name);

        console.log(data);

        // sendRequest(data, query, signature, section_name)
        sendRequest(query, signature, section_name)
        .then((result) => {
            console.log(result);

            const $ = cheerio.load(result);
            // console.log(`response body: ${body}`);

            const results = {
                total_fee: $('TotalFeesEstimate Amount').text(),
                selling_price: $('ListingPrice Amount').text(),
                shipping: $('Shipping Amount').text(),
            };

            resolve(results);
        })
        .catch((err) => {
            console.log(err);
            reject(err);
        });
    });
}


/**
* get FBA Storage fee.
*
* Unit of length: cm
* currency : JPY
*
* @param {int} height height of your package.
* @param {int} length length of your package.
* @param {int} width  width of your package.
*
* @return {int} fee   storage fee your package for 1 day.
*
*/
function getStorageFee(height, length, width){
    const base = 8.126;
    const cube = height * length * width;

    // ¥8.126 × {[商品サイズ(cm3)] ⁄ (10cm×10cm×10cm)}×[保管日数 ⁄ 当月の日数]
    const fee = base * (cube / (10 * 10 * 10)) * (30 / 30);
    return Math.ceil(fee);
}