# MWS-API-getMyFeesEstimate
Calculate FBA(Fullfilled by Amazon) fee by using getMyFeesEstimate function on Amazon MWS API.

# Requirements
## MWS API keys
you need your own Amazon MWS API keys. and you must have at Professional selling plan to use it.
here's how to register:https://sellercentral.amazon.com/gp/mws/registration/register.html571


## file for Authorization infos
for security reason, you should store your credential infos for access MWS API in external file.
The name of file should be "amzn-credential.json"

here's example of amzn-credential.json:

```
{
    'SELLER_ID': 'SELLER_ID',
    'ACCESS_KEY_ID': 'ACCESS_KEY_ID',
    'SECRET_KEY': 'SECRET_KEY',
    'MARKETPLACE_ID': 'MARKETPLACE_ID',
};
```

## add your credential file name into .gitignore
If you use git, you are storngly adviced to make .gitignore file in order not to go public your credential infos.


# Licence
This software is released under the MIT License.