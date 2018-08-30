#include <boost/date_time/gregorian/gregorian.hpp>
#include <sys/time.h>

#include <cassert>
#include <dirent.h>
#include <fstream>
#include <iostream>
#include <map>
#include <set>
#include <string>
#include <vector>

using namespace std;

class MutualFundData
{
public:
  enum class TYPE
  {
    NAV,

    ONE_MNTH_NAV_AVG,

    ONE_YR_NAV_CAGR,
    THREE_YR_NAV_CAGR,
    FIVE_YR_NAV_CAGR,

    TWO_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR,
    FOUR_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR,
  };

public:
  MutualFundData(double nav)
    : mpNav(new double(nav)),
      mpOneMnthNavAvg(nullptr),
      mpOneYrNavCagr(nullptr),
      mpThreeYrNavCagr(nullptr),
      mpFiveYrNavCagr(nullptr),
      mpTwoYrVarSumForOneYrNavCagr(nullptr),
      mpFourYrVarSumForOneYrNavCagr(nullptr)
  {
  }

  MutualFundData(const MutualFundData &d)
    : mpNav(new double(*d.mpNav)),
      mpOneMnthNavAvg(nullptr),
      mpOneYrNavCagr(nullptr),
      mpThreeYrNavCagr(nullptr),
      mpFiveYrNavCagr(nullptr),
      mpTwoYrVarSumForOneYrNavCagr(nullptr),
      mpFourYrVarSumForOneYrNavCagr(nullptr)
  {
    if (d.mpOneMnthNavAvg)
    {
      mpOneMnthNavAvg = new double(*d.mpOneMnthNavAvg);
    }

    if (d.mpOneYrNavCagr)
    {
      mpOneYrNavCagr = new double(*d.mpOneYrNavCagr);
    }
    if (d.mpThreeYrNavCagr)
    {
      mpThreeYrNavCagr = new double(*d.mpThreeYrNavCagr);
    }
     if (d.mpFiveYrNavCagr)
    {
      mpFiveYrNavCagr = new double(*d.mpFiveYrNavCagr);
    }

    if (d.mpTwoYrVarSumForOneYrNavCagr)
    {
      mpTwoYrVarSumForOneYrNavCagr =
        new double(*d.mpTwoYrVarSumForOneYrNavCagr);
    }
    if (d.mpFourYrVarSumForOneYrNavCagr)
    {
      mpFourYrVarSumForOneYrNavCagr =
        new double(*d.mpFourYrVarSumForOneYrNavCagr);
    }
  }

  ~MutualFundData()
  {
    delete mpNav;

    delete mpOneMnthNavAvg;

    delete mpOneYrNavCagr;
    delete mpThreeYrNavCagr;
    delete mpFiveYrNavCagr;

    delete mpTwoYrVarSumForOneYrNavCagr;
    delete mpFourYrVarSumForOneYrNavCagr;
  }

  MutualFundData& operator=(const MutualFundData&) = delete;

  const double* Get(TYPE type) const
  {
    switch (type)
    {
      case TYPE::NAV:
        return mpNav;

      case TYPE::ONE_MNTH_NAV_AVG:
        return mpOneMnthNavAvg;

      case TYPE::ONE_YR_NAV_CAGR:
        return mpOneYrNavCagr;
      case TYPE::THREE_YR_NAV_CAGR:
        return mpThreeYrNavCagr;
      case TYPE::FIVE_YR_NAV_CAGR:
        return mpFiveYrNavCagr;

      case TYPE::TWO_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR:
        return mpTwoYrVarSumForOneYrNavCagr;
      case TYPE::FOUR_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR:
        return mpFourYrVarSumForOneYrNavCagr;

      default:
        assert(false);
    }
  }

  void Set(TYPE type, double val)
  {
    switch (type)
    {
      case TYPE::ONE_MNTH_NAV_AVG:
        mpOneMnthNavAvg = new double(val);
        break;

      case TYPE::ONE_YR_NAV_CAGR:
        mpOneYrNavCagr = new double(val);
        break;
      case TYPE::THREE_YR_NAV_CAGR:
        mpThreeYrNavCagr = new double(val);
        break;
      case TYPE::FIVE_YR_NAV_CAGR:
        mpFiveYrNavCagr = new double(val);
        break;

      case TYPE::TWO_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR:
        mpTwoYrVarSumForOneYrNavCagr = new double(val);
        break;
      case TYPE::FOUR_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR:
        mpFourYrVarSumForOneYrNavCagr = new double(val);
        break;

      default:
        assert(false);
    }
  }

private:
  double* mpNav;

  double* mpOneMnthNavAvg;

  double* mpOneYrNavCagr;
  double* mpThreeYrNavCagr;
  double* mpFiveYrNavCagr;

  double* mpTwoYrVarSumForOneYrNavCagr;
  double* mpFourYrVarSumForOneYrNavCagr;
};

class MutualFund
{
public:
  MutualFund(long code,
             const string& name,
             const boost::gregorian::date& date,
             const MutualFundData& data)
    : mCode(code),
      mName(name)
  {
    mData.insert(make_pair(date, data));
  }

public:
  long mCode;
  string mName;
  map<boost::gregorian::date, MutualFundData> mData;
};

vector<string>
GetNavFileNames(const string& parentDir)
{
  vector<string> file_names;

  struct dirent* dir;
  DIR* dirp = opendir(parentDir.c_str());

  if (dirp)
  {
    while ((dir = readdir(dirp)) != 0)
    {
      if (strcmp(dir->d_name, ".") && strcmp(dir->d_name, ".."))
      {
        file_names.push_back(parentDir + "/" + dir->d_name);
      }
    }

    closedir(dirp);
  }

  return file_names;
}

vector<string>
Split(const string& str, const string& delimiter)
{
  size_t pos_start = 0, pos_end, delim_len = delimiter.length();

  string token;
  vector<string> res;

  while ((pos_end = str.find(delimiter, pos_start)) != string::npos)
  {
    token = str.substr(pos_start, pos_end - pos_start);
    pos_start = pos_end + delim_len;
    res.push_back(token);
  }

  res.push_back(str.substr(pos_start));
  return res;
}

stringstream
ReadAllNavFiles(const vector<string>& fileNames)
{
  cout << "Reading " << fileNames.size() << " NAV files" << endl;

  stringstream raw_mf_data;
  for (size_t i = 0; i < fileNames.size(); ++i)
  {
    ifstream in(fileNames.at(i).c_str());
    raw_mf_data << in.rdbuf();
    in.close();
  }

  cout << "Read " << fileNames.size() << " NAV files" << endl;

  return raw_mf_data;
}

tuple<long, long>
ReadMFCode(stringstream& rawMfData)
{
  cout << "Reading MF Data for minimum and maximum MF Code values" << endl;

  set<long> mf_codes;
  string line;

  rawMfData.clear();
  rawMfData.seekg(0, rawMfData.beg);
  while (getline(rawMfData, line))
  {
    if (line.size() > 0)
    {
      vector<string> fields = Split(line, ";");
      if (fields.size() == 6 &&
          !fields.at(0).empty() && // code
          !fields.at(1).empty() && // name
          !fields.at(2).empty() && // nav
          !fields.at(5).empty())   // date
      {
        long code;

        try
        {
          // silently fail
          if (fields.at(0) == "Scheme Code")
          {
            continue;
          }

          // remove leading and trailing whitespaces
          fields.at(0).erase(0, fields.at(0).find_first_not_of(" \t\r\n"));
          fields.at(0).erase(fields.at(0).find_last_not_of(" \t\r\n") + 1);

          if (fields.at(0).find_first_not_of("0123456789") !=
              std::string::npos)
          {
            throw exception();
          }

          code = stol(fields.at(0));
        }
        catch (const exception& e)
        {
          cout << "Dropping: " << line << endl;
          continue;
        }

        mf_codes.insert(code);
      }
    }
  }

  long min_mf_code = *mf_codes.begin();
  long max_mf_code = *mf_codes.rbegin();

  cout << "Read " << mf_codes.size() << " mutual funds"
       << " with minimum MF Code " << min_mf_code
       << " and maximum MF Code " << max_mf_code
       << endl;

  return make_tuple(min_mf_code, max_mf_code);
}

map<long, MutualFund>
ReadMFData(stringstream& rawMfData,
           long startingMfCode, long endingMfCode)
{
  cout << "Reading MF Data"
       << " with MF Codes between " << startingMfCode
       << " and " << endingMfCode << endl;

  map<long, MutualFund> mutual_funds;
  int num_nav = 0;
  string line;

  rawMfData.clear();
  rawMfData.seekg(0, rawMfData.beg);
  while (getline(rawMfData, line))
  {
    if (line.size() > 0)
    {
      vector<string> fields = Split(line, ";");
      if (fields.size() == 6 &&
          !fields.at(0).empty() && // code
          !fields.at(1).empty() && // name
          !fields.at(2).empty() && // nav
          !fields.at(5).empty())   // date
      {
        long code;
        string name;
        double nav_value;
        boost::gregorian::date nav_date;

        try
        {
          // silently fail
          if (fields.at(0) == "Scheme Code")
          {
            continue;
          }

          // silently fail
          if (fields.at(2) == "NA" ||
              fields.at(2) == "N.A." ||
              fields.at(2) == "N/A" ||
              fields.at(2) == "#N/A" ||
              fields.at(2) == "#DIV/0!" ||
              fields.at(2) == "B.C." ||
              fields.at(2) == "B. C." ||
              fields.at(2) == "-")
          {
            continue;
          }

          // remove leading and trailing whitespaces
          fields.at(0).erase(0, fields.at(0).find_first_not_of(" \t\r\n"));
          fields.at(0).erase(fields.at(0).find_last_not_of(" \t\r\n") + 1);
          fields.at(1).erase(0, fields.at(1).find_first_not_of(" \t\r\n"));
          fields.at(1).erase(fields.at(1).find_last_not_of(" \t\r\n") + 1);
          fields.at(2).erase(0, fields.at(2).find_first_not_of(" \t"));
          fields.at(2).erase(fields.at(2).find_last_not_of(" \t") + 1);
          fields.at(5).erase(0, fields.at(5).find_first_not_of(" \t\r\n"));
          fields.at(5).erase(fields.at(5).find_last_not_of(" \t\r\n") + 1);

          // remove " and ' from name
          fields.at(1).erase(remove(fields.at(1).begin(),
                                    fields.at(1).end(),
                                    '\"'),
                             fields.at(1).end());
          fields.at(1).erase(remove(fields.at(1).begin(),
                                    fields.at(1).end(),
                                    '\''),
                             fields.at(1).end());

          // remove comma from nav
          fields.at(2).erase(remove(fields.at(2).begin(),
                                    fields.at(2).end(),
                                    ','),
                             fields.at(2).end());

          if (fields.at(0).find_first_not_of("0123456789") !=
              std::string::npos)
          {
            throw exception();
          }

          if (fields.at(2).find_first_not_of("0123456789.") !=
              std::string::npos)
          {
            throw exception();
          }

          code = stol(fields.at(0));
          name = fields.at(1);
          nav_value = stod(fields.at(2));

          vector<string> dates = Split(fields.at(5), "-");

          if (dates.size() != 3)
          {
            throw exception();
          }

          if (dates.at(0).find_first_not_of("0123456789") !=
              std::string::npos)
          {
            throw exception();
          }

          if (dates.at(2).find_first_not_of("0123456789") !=
              std::string::npos)
          {
            throw exception();
          }

          // yyyy, mmm, dd
          nav_date = boost::gregorian::date(
              stoi(dates.at(2)),
              boost::date_time::month_str_to_ushort<
                  boost::gregorian::greg_month>(dates[1]),
              stoi(dates.at(0)));

          // silently fail
          if (nav_value == 0)
          {
            continue;
          }
        }
        catch (const exception& e)
        {
          //cout << "Dropping: " << line << endl;
          continue;
        }

        if (code < startingMfCode || code > endingMfCode)
        {
          continue;
        }

        if (mutual_funds.find(code) == mutual_funds.end())
        {
          MutualFundData mf_data(nav_value);
          MutualFund mf(code, name, nav_date, mf_data);
          mutual_funds.insert(make_pair(code, mf));
        }
        else
        {
          mutual_funds.at(code).mName = name;
          MutualFundData mf_data(nav_value);
          mutual_funds.at(code).mData.insert(
              make_pair(nav_date, mf_data));
        }

        num_nav++;
      }
    }
  }

  cout << "Read " << mutual_funds.size() << " mutual funds and "
       << num_nav << " NAVs" << endl;

  return mutual_funds;
}

void
AddMissingDates(map<long, MutualFund>& mutualFunds)
{
  cout << "Cleaning " << mutualFunds.size() << " mutual funds" << endl;

  int added_navs = 0;
  int i = 0;

  for (auto& mfKv : mutualFunds)
  {
    ++i;
    if (i % 1000 == 0)
    {
      cout << "[" << (i + 1) << "/" << mutualFunds.size() << "]"
           << " Cleaning..." << endl;
    }

    double last_valid_nav =
      *mfKv.second.mData.begin()->second.Get(MutualFundData::TYPE::NAV);

    for (boost::gregorian::date d = mfKv.second.mData.begin()->first;
         d <= mfKv.second.mData.rbegin()->first;
         d += boost::gregorian::date_duration(1))
    {
      if (mfKv.second.mData.find(d) == mfKv.second.mData.end())
      {
        // for missing date, use the last read nav
        mfKv.second.mData.insert(make_pair(d, MutualFundData(last_valid_nav)));
        added_navs++;
      }
      else
      {
        last_valid_nav =
          *mfKv.second.mData.at(d).Get(MutualFundData::TYPE::NAV);
      }
    }
  }

  cout << "Cleaned " << mutualFunds.size() << " mutual funds"
       << " and added " << added_navs << " NAVs" << endl;
}

tuple<bool, double>
CalculateCagr(const map<boost::gregorian::date, MutualFundData>& mfData,
              const boost::gregorian::date& presentDate,
              MutualFundData::TYPE type,
              int daysAgo)
{
  boost::gregorian::date old_date = presentDate -
    boost::gregorian::date_duration(daysAgo);

  if (mfData.find(old_date) != mfData.end())
  {
    const double* old_val = mfData.at(old_date).Get(type);
    if (old_val == nullptr)
    {
      return make_tuple(false, 0);
    }

    const double* present_val = mfData.at(presentDate).Get(type);

    double cagr = (pow((*present_val / *old_val), 365.0f/daysAgo) - 1) * 100.0f;
    return make_tuple(true, cagr);
  }

  return make_tuple(false, 0);
}

tuple<bool, double>
CalculateAverage(
    const map<boost::gregorian::date, MutualFundData>& mfData,
    const boost::gregorian::date& presentDate,
    MutualFundData::TYPE type,
    double& rollingTotal,
    int windowDays)
{
  if (mfData.at(presentDate).Get(type) != nullptr)
  {
    const double current_value = *mfData.at(presentDate).Get(type);

    rollingTotal += current_value;

    boost::gregorian::date first_date = presentDate -
      boost::gregorian::date_duration(windowDays - 1);

    if (mfData.find(first_date) != mfData.end())
    {
      const double* first_value = mfData.at(first_date).Get(type);
      if (first_value == nullptr)
      {
        return make_tuple(false, 0);
      }

      double current_average = rollingTotal / windowDays;

      rollingTotal -= *first_value;

      return make_tuple(true, current_average);
    }
  }

  return make_tuple(false, 0);
}

tuple<bool, double, double>
CalculateAverageAndVarianceSum(
    const map<boost::gregorian::date, MutualFundData>& mfData,
    const boost::gregorian::date& presentDate,
    MutualFundData::TYPE type,
    double& rollingTotal,
    double& prevVarSum,
    double& prevAverage,
    int windowDays)
{
  if (mfData.at(presentDate).Get(type) != nullptr)
  {
    const double current_value = *mfData.at(presentDate).Get(type);

    rollingTotal += current_value;

    boost::gregorian::date first_date = presentDate -
      boost::gregorian::date_duration(windowDays - 1);

    if (mfData.find(first_date) != mfData.end())
    {
      const double* first_value = mfData.at(first_date).Get(type);
      if (first_value == nullptr)
      {
        return make_tuple(false, 0, 0);
      }

      double current_average = rollingTotal / windowDays;

      rollingTotal -= *first_value;

      // first run
      double var_sum;
      if (prevVarSum == 0)
      {
        double squared_diff_total = 0;
        boost::gregorian::date temp_date;
        for (temp_date = first_date;
             temp_date <= presentDate;
             temp_date += boost::gregorian::date_duration(1))
        {
          const double value = *mfData.at(temp_date).Get(type);
          squared_diff_total += pow(value - current_average, 2);
        }
        var_sum = squared_diff_total;
      }
      else
      {
        const double out_of_window_value = *mfData.at(
            first_date - boost::gregorian::date_duration(1)).Get(type);

        var_sum = prevVarSum +
          ((current_value - out_of_window_value) *
          (current_value - current_average + out_of_window_value - prevAverage));
      }

      prevAverage = current_average;
      prevVarSum = var_sum;

      return make_tuple(true, var_sum, current_average);
    }
  }

  return make_tuple(false, 0, 0);
}

void
CalculateStatistics(map<long, MutualFund>& mutualFunds)
{
  // cagr = ((final_value / initial_value)^(1 / number of periods) - 1) x 100
  // std_dev = ((sum of [(actual - mean)^2]) / N)^(1/2)
  // std_dev = sqrt(var_sum/size)
  // http://jonisalonen.com/2014/efficient-and-accurate-rolling-standard-deviation/
  // variance_sum = prev_variance_sum +
  //   (newest_val - oldest_val_just_outside_window) *
  //   (newest_val - new_avg + oldest_val_just_outside_window - prev_avg)

  cout << "Calculating statistics for " << mutualFunds.size()
       << " mutual funds" << endl;

  int i = 0;
  for (auto& mfKv : mutualFunds)
  {
    ++i;
    if (i % 1000 == 0)
    {
      cout << "[" << (i + 1) << "/" << mutualFunds.size() << "]"
           << " Calculating..." << endl;
    }

    double one_yr_nav_rolling_total = 0;

    double two_yr_rolling_total_for_one_yr_nav_cagr = 0;
    double prev_two_yr_var_sum_for_one_yr_nav_cagr = 0;
    double prev_two_yr_avg_for_one_yr_nav_cagr = 0;

    double four_yr_rolling_total_for_one_yr_nav_cagr = 0;
    double prev_four_yr_var_sum_for_one_yr_nav_cagr = 0;
    double prev_four_yr_avg_for_one_yr_nav_cagr = 0;

    for (auto& dataKv : mfKv.second.mData)
    {
      // NAV AVG ----------------------------------------------------
      {
        auto res = CalculateAverage(mfKv.second.mData, dataKv.first,
                                    MutualFundData::TYPE::NAV,
                                    one_yr_nav_rolling_total,
                                    30);
        if (get<0>(res))
        {
          mfKv.second.mData.at(
            dataKv.first - boost::gregorian::date_duration(15)).Set(
              MutualFundData::TYPE::ONE_MNTH_NAV_AVG, get<1>(res));
        }
      }

      // NAV CAGR ---------------------------------------------------
      {
        auto res = CalculateCagr(mfKv.second.mData, dataKv.first,
                                 MutualFundData::TYPE::NAV, 365);
        if (get<0>(res))
        {
          dataKv.second.Set(MutualFundData::TYPE::ONE_YR_NAV_CAGR,
                            get<1>(res));
        }
      }
      {
        auto res = CalculateCagr(mfKv.second.mData, dataKv.first,
                                 MutualFundData::TYPE::NAV, 1095);
        if (get<0>(res))
        {
          dataKv.second.Set(MutualFundData::TYPE::THREE_YR_NAV_CAGR,
                            get<1>(res));
        }
      }
      {
        auto res = CalculateCagr(mfKv.second.mData, dataKv.first,
                                 MutualFundData::TYPE::NAV, 1825);
        if (get<0>(res))
        {
          dataKv.second.Set(MutualFundData::TYPE::FIVE_YR_NAV_CAGR,
                            get<1>(res));
        }
      }

      // DEVIATION OF 1 YR CAGR -------------------------------------
      {
        auto res = CalculateAverageAndVarianceSum(
            mfKv.second.mData, dataKv.first,
            MutualFundData::TYPE::ONE_YR_NAV_CAGR,
            two_yr_rolling_total_for_one_yr_nav_cagr,
            prev_two_yr_var_sum_for_one_yr_nav_cagr,
            prev_two_yr_avg_for_one_yr_nav_cagr,
            730);

        if (get<0>(res))
        {
          dataKv.second.Set(
              MutualFundData::TYPE::TWO_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR,
              get<1>(res));
        }
      }
      {
        auto res = CalculateAverageAndVarianceSum(
            mfKv.second.mData, dataKv.first,
            MutualFundData::TYPE::ONE_YR_NAV_CAGR,
            four_yr_rolling_total_for_one_yr_nav_cagr,
            prev_four_yr_var_sum_for_one_yr_nav_cagr,
            prev_four_yr_avg_for_one_yr_nav_cagr,
            1460);

        if (get<0>(res))
        {
          dataKv.second.Set(
              MutualFundData::TYPE::FOUR_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR,
              get<1>(res));
        }
      }
    }
  }

  cout << "Calculated statistics for " << mutualFunds.size()
       << " mutual funds" << endl;
}

void
WriteToCsv(map<long, MutualFund>& mutualFunds,
           const string& directory,
           stringstream& mfCodeLookup)
{
  cout << "Writing CSVs for " << mutualFunds.size()
       << " mutual funds" << endl;

  int i = 0;
  for (auto& mfKv : mutualFunds)
  {
    ++i;
    if (i % 1000 == 0)
    {
      cout << "[" << (i + 1) << "/" << mutualFunds.size() << "]"
           << " Writing..." << endl;
    }

    string file_name = directory + "/" + to_string(mfKv.second.mCode) + ".csv";
    ofstream out(file_name.c_str());

    for (auto& dataKv : mfKv.second.mData)
    {
      out << fixed << setprecision(4)
          << to_iso_extended_string(dataKv.first) << ","
          << *dataKv.second.Get(MutualFundData::TYPE::NAV) << ",";

      {
        auto data = dataKv.second.Get(MutualFundData::TYPE::ONE_MNTH_NAV_AVG);
        if (data != nullptr)
        {
          out << *data;
        }
      }

      out << ",";
      {
        auto data = dataKv.second.Get(MutualFundData::TYPE::ONE_YR_NAV_CAGR);
        if (data != nullptr)
        {
          out << *data;
        }
      }

      out << ",";
      {
        auto data = dataKv.second.Get(MutualFundData::TYPE::THREE_YR_NAV_CAGR);
        if (data != nullptr)
        {
          out << *data;
        }
      }

      out << ",";
      {
        auto data = dataKv.second.Get(MutualFundData::TYPE::FIVE_YR_NAV_CAGR);
        if (data != nullptr)
        {
          out << *data;
        }
      }

      out << ",";
      {
        auto data = dataKv.second.Get(
            MutualFundData::TYPE::TWO_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR);
        if (data != nullptr)
        {
          out << pow(*data / 730.0f, 0.5f);
        }
      }

      out << ",";
      {
        auto data = dataKv.second.Get(
            MutualFundData::TYPE::FOUR_YR_VARIANCE_SUM_FOR_ONE_YR_NAV_CAGR);
        if (data != nullptr)
        {
          out << pow(*data / 1460.0f, 0.5f);
        }
      }

      out << endl;
    }

    out.close();
  }

  for (auto& mfKv : mutualFunds)
  {
    mfCodeLookup << to_string(mfKv.first) << ","
                 << mfKv.second.mName
                 << endl;
  }

  cout << "Wrote CSVs for " << mutualFunds.size()
       << " mutual funds" << endl;
}

void
WriteMfCodeLookupToCsv(const string& directory,
                       const stringstream& mfCodeLookup)
{
  cout << "Writing CSV for MF Code lookup" << endl;

  string file_name = directory + "/mf_code_names.csv";
  ofstream out(file_name.c_str());
  out << mfCodeLookup.rdbuf();
  out.close();

  string file_name1 = directory + "/format.csv";
  ofstream out1(file_name1.c_str());

  out1 << "Date,"
       << "NAV,"                          // 0
       << "1 Mnth Avg,"                   // 1
       << "1 Yr Cagr,"                    // 2
       << "3 Yr Cagr,"                    // 3
       << "5 Yr Cagr,"                    // 4
       << "2 Yr Std Dev of 1 Yr Cagr,"    // 5
       << "4 Yr Std Dev of 1 Yr Cagr,"    // 6
       << endl;

  out1.close();

  cout << "Wrote CSV for MF Code lookup" << endl;
}

long
GetCurrentTimeSecs()
{
  struct timeval tp;
  gettimeofday(&tp, NULL);
  long secs = tp.tv_sec + tp.tv_usec / 1000000;
  return secs;
}

int
main()
{
  long start_secs = GetCurrentTimeSecs();

  const string nav_dir = "nav";
  const string csv_dir = "static/csv";
  const long MF_BATCH_SIZE = 5000;

  vector<string> file_names = GetNavFileNames(nav_dir);
  stringstream raw_mf_data = ReadAllNavFiles(file_names);
  auto res = ReadMFCode(raw_mf_data);

  long min_mf_code = get<0>(res);
  long max_mf_code = get<1>(res);

  stringstream mf_code_lookup;

  long starting_mf_code = min_mf_code;
  while (starting_mf_code <= max_mf_code)
  {
    long ending_mf_code = min(starting_mf_code + MF_BATCH_SIZE, max_mf_code);
    map<long, MutualFund> mutual_funds = ReadMFData(raw_mf_data,
                                                    starting_mf_code,
                                                    ending_mf_code);
    AddMissingDates(mutual_funds);
    CalculateStatistics(mutual_funds);
    WriteToCsv(mutual_funds, csv_dir, mf_code_lookup);

    starting_mf_code = ending_mf_code + 1;
  }

  WriteMfCodeLookupToCsv(csv_dir, mf_code_lookup);

  long end_secs = GetCurrentTimeSecs();
  cout << "Time taken: "
       << (end_secs - start_secs) / 60 << "m "
       << (end_secs - start_secs) % 60 << "s "
       << endl;
}
